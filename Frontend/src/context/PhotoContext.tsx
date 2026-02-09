
import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { Photo, PhotoContextType, DBMedia } from '../type';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';


const PhotoContext = createContext<PhotoContextType | undefined>(undefined);

export function PhotoProvider({ children }: { children: ReactNode }) {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [categories, setCategories] = useState<string[]>([]);

    const { user } = useAuth();

    // Auth 이메일을 기반으로 public.users ID 가져오기 헬퍼 함수
    // 앱 사용자 ID 캐싱을 위한 ref
    const appUserIdRef = useRef<number | null>(null);

    const fetchAppUserId = async (): Promise<number | null> => {
        if (!user || !user.email) return null;

        // 캐시된 ID가 있으면 반환 (불필요한 DB 조회 방지)
        if (appUserIdRef.current !== null) {
            return appUserIdRef.current;
        }

        try {
            // 1. 먼저 사용자 조회 시도
            const { data, error } = await supabase
                .from('users')
                .select('user_id')
                .eq('email', user.email)
                .maybeSingle();

            if (error) {
                console.error("fetchAppUserId lookup error:", error);
                // 에러 발생 시 진행하지 않음
                return null;
            }

            if (data) {
                appUserIdRef.current = data.user_id;
                return data.user_id;
            }

            // 2. 사용자가 없으면 자동 생성 (자기 치유)
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                    email: user.email,
                    password: 'managed_by_supabase',
                    created_time: new Date().toISOString(),
                    last_login: new Date().toISOString()
                })
                .select('user_id')
                .single();

            if (createError || !newUser) {
                console.error('유저 자동 생성 실패:', createError);
                return null;
            }

            appUserIdRef.current = newUser.user_id;
            return newUser.user_id;
        } catch (err) {
            console.error("fetchAppUserId exception:", err);
            return null;
        }
    };

    // 초기 데이터 로드 및 인증 상호작용
    useEffect(() => {
        let isMounted = true;

        // 유저가 바뀌면(로그아웃 등) 캐시 초기화
        if (!user) {
            appUserIdRef.current = null;
        }

        const loadData = async () => {
            if (user) {
                // 사용자 식별(ID)과 무관하게 데이터 로드 (전역 공유 앨범)
                // fetchAppUserId는 업로드 시에만 필수적이므로 여기선 호출하지 않거나 비동기 처리
                await Promise.all([
                    fetchCategories(),
                    fetchPhotos()
                ]);
            } else {
                setPhotos([]);
                setCategories([]);
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
        // user 객체 전체가 아닌 id만 비교하여 불필요한 재실행 방지
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('category') // 소문자 테이블명
                .select('name')
                .order('name'); // 모든 카테고리 조회

            if (error) throw error;

            if (data) {
                // 중복 제거
                const uniqueNames = Array.from(new Set(data.map(c => c.name)));
                setCategories(uniqueNames);
            }
        } catch (error) {
            console.error('카테고리 불러오기 실패:', error);
        }
    };

    const fetchPhotos = async () => {
        try {
            // Join 데이터 가져오기: media + location + category + media_description
            const { data, error } = await supabase
                .from('media') // 소문자 테이블명
                .select(`
                    *,
                    location (*),
                    category (*),
                    media_description (*)
                `)
                .order('created_time', { ascending: false }); // 모든 사진 조회

            if (error) {
                console.error('사진 불러오기 실패:', error);
                return;
            }

            if (data) {
                const loadedPhotos: Photo[] = (data as unknown as DBMedia[]).map(mapMediaToPhoto);
                setPhotos(loadedPhotos);
            }
        } catch (err) {
            console.error('사진 불러오기 중 예기치 못한 오류 발생:', err);
        }
    };

    const mapMediaToPhoto = (media: DBMedia): Photo => {
        // 데이터 매핑: index.ts의 DBMedia 인터페이스에 정의된 소문자 필드명 사용
        const loc = media.location;
        const cat = media.category;
        const descData = media.media_description;

        let descText = '';

        // media_description은 1:1 관계이므로 객체로 올 수도 있고, 일부 상황에선 배열일 수도 있음 (Supabase 쿼리 방식에 따라)
        // 하지만 타입 정의상으로는 DBMediaDescription | undefined
        if (Array.isArray(descData)) {
            if (descData.length > 0) descText = descData[0].description_text || '';
        } else if (descData) {
            descText = descData.description_text || '';
        }

        return {
            id: String(media.media_id), // 프론트엔드 호환성을 위해 BIGINT를 문자열로 변환
            url: media.file_url || '',
            title: descText ? (descText.length > 20 ? descText.substring(0, 20) + '...' : descText) : '제목 없음',
            description: descText,
            location: loc?.address_text || 'Unknown',
            lat: loc?.lat,
            lng: loc?.lon,
            date: media.take_time ? new Date(media.take_time).toLocaleDateString() : new Date().toLocaleDateString(), // taken_time -> take_time
            tags: cat ? [cat.name] : [],
            category: cat?.name || '기타',
            isFavorite: false, // 스키마에 없음
            aspectRatio: 'h-[400px]' // 기본값
        };
    };

    const addCategory = (name: string) => {
        setCategories(prev => {
            if (prev.includes(name)) return prev;
            return [...prev, name];
        });
    };



    const addPhoto = async (photo: Photo, _file: File | null, meta: { folder: string, description: string, tags: string, lat?: number, lng?: number }) => {
        const toastId = toast.loading("데이터베이스에 저장 중...");
        try {
            // useRef를 사용하므로 current 값 확인
            if (!appUserIdRef.current) {
                // 혹시 null이면 다시 시도 (안전장치)
                const refreshedId = await fetchAppUserId();
                if (!refreshedId) {
                    throw new Error("사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.");
                }
            }
            const userId = appUserIdRef.current!;

            // 1. LOCATION 추가
            // 일부 스키마에서는 위치 정보가 공유되거나 사용자 무관할 수 있지만, 가능하면 연결하는 것이 좋습니다.
            // 제공된 스키마에는 location 테이블에 user_id가 없습니다. 따라서 여기서는 생략합니다.
            // 하지만 location_cluster에는 user_id가 있습니다. 현재는 location에 직접 삽입합니다.
            const { data: locData, error: locError } = await supabase
                .from('location') // 소문자 테이블명
                .insert({
                    lat: meta.lat || 0,
                    lon: meta.lng || 0,
                    address_text: meta.folder, // 실제 주소가 없으면 폴더명을 주소/위치 대용으로 사용
                    created_time: new Date().toISOString()
                })
                .select()
                .single();

            if (locError) {
                throw new Error(`위치 저장 실패: ${locError.message}`);
            }

            // 2. CATEGORY 추가/조회
            // 사용자의 기존 카테고리를 먼저 확인
            let categoryId: number;

            const { data: existingCat } = await supabase
                .from('category') // 소문자 테이블명
                .select('category_id')
                .eq('name', meta.folder)
                .eq('user_id', userId) // 이 사용자의 카테고리인지 확인
                .maybeSingle();

            if (existingCat) {
                categoryId = existingCat.category_id;
            } else {
                // 새 카테고리 생성
                const { data: newCat, error: catInsertError } = await supabase
                    .from('category') // 소문자 테이블명
                    .insert({
                        name: meta.folder,
                        user_id: userId // 사용자와 연결
                    })
                    .select()
                    .single();

                if (catInsertError || !newCat) {
                    throw new Error(`카테고리 생성 실패: ${catInsertError?.message}`);
                }
                categoryId = newCat.category_id;
            }

            // 3. MEDIA 추가
            const { data: mediaData, error: mediaError } = await supabase
                .from('media') // 소문자 테이블명
                .insert({
                    user_id: userId, // 사용자와 연결
                    category_id: categoryId,
                    location_id: locData.location_id,
                    media_type: 'IMAGE',
                    file_url: photo.url,
                    take_time: new Date().toISOString(), // taken_time -> take_time
                    created_time: new Date().toISOString()
                })
                .select()
                .single();

            if (mediaError) {
                throw new Error(`미디어 저장 실패: ${mediaError.message}`);
            }

            // 4. MEDIA_DESCRIPTION 추가
            if (meta.description) {
                const { error: descError } = await supabase
                    .from('media_description') // 소문자 테이블명
                    .insert({
                        media_id: mediaData.media_id,
                        description_text: meta.description
                    });

                if (descError) {
                    // 설명 저장 실패는 치명적이지 않으므로 로그만 남김 (또는 사용자에게 알림)
                    console.warn('미디어 설명 저장 실패:', descError);
                }
            }

            toast.success("사진 업로드 완료!", { id: toastId });

            // 목록 새로고침 (인자 없음)
            fetchPhotos();
            fetchCategories();

        } catch (error: any) {
            console.error('사진 추가 중 오류:', error);
            toast.error(`업로드 실패: ${error.message}`, { id: toastId });
        }
    };

    const deletePhoto = async (id: string) => {
        // Cascade 삭제는 보통 DB에서 처리되지만, 여기서는 MEDIA에 대해 명시적으로 삭제를 호출합니다
        const { error } = await supabase.from('media').delete().eq('media_id', id);
        if (!error) {
            setPhotos(prev => prev.filter(p => p.id !== id));
        } else {
            toast.error("Failed to delete");
        }
    };

    const toggleFavorite = (id: string) => {
        // 요청에 따라 현재는 로컬 상태만 변경
        setPhotos(prev => prev.map(p =>
            p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
        ));
    };



    return (
        <PhotoContext.Provider value={{
            photos,
            categories,
            addPhoto,
            deletePhoto,
            toggleFavorite,
            addCategory
        }}>
            {children}
        </PhotoContext.Provider>
    );
}

export function usePhotoContext() {
    const context = useContext(PhotoContext);
    if (context === undefined) {
        throw new Error('usePhotoContext must be used within a PhotoProvider');
    }
    return context;
}
