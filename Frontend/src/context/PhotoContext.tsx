
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Photo, PhotoContextType, DBMedia } from '../type';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

const PhotoContext = createContext<PhotoContextType | undefined>(undefined);

export function PhotoProvider({ children }: { children: ReactNode }) {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [categories, setCategories] = useState<string[]>([]);

    const { user } = useAuth();

    // 초기 데이터 로드 및 인증 상호작용
    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            if (user && user.id && isMounted) {
                await Promise.all([
                    fetchCategories(user.id),
                    fetchPhotos(user.id)
                ]);
            }
        };
        loadData();

        return () => {
            isMounted = false;
        };
        // user 객체 전체가 아닌 id만 비교하여 불필요한 재실행 방지
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const fetchCategories = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('category') // 소문자 테이블명
                .select('name')
                .eq('user_id', userId)
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

    const fetchPhotos = async (userId: string) => {
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
                .eq('user_id', userId)
                .order('created_time', { ascending: false }); // 모든 사진 조회

            if (error) {
                console.error('사진 불러오기 실패:', error);
                return;
            }

            // 추가: 해당 사용자의 즐겨찾기(Favorites) 목록 가져오기
            const { data: favData } = await supabase
                .from('favorites')
                .select('media_id')
                .eq('user_id', userId);

            const favoriteIds = new Set(favData?.map(f => String(f.media_id)) || []);

            if (data) {
                const loadedPhotos: Photo[] = (data as unknown as DBMedia[]).map(media => {
                    const photo = mapMediaToPhoto(media);
                    return {
                        ...photo,
                        isFavorite: favoriteIds.has(photo.id)
                    };
                });
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
        let fullDesc = '';

        // media_description은 1:1 관계이므로 객체로 올 수도 있고, 일부 상황에선 배열일 수도 있음 (Supabase 쿼리 방식에 따라)
        // 하지만 타입 정의상으로는 DBMediaDescription | undefined
        if (Array.isArray(descData)) {
            if (descData.length > 0) fullDesc = descData[0].description_text || '';
        } else if (descData) {
            fullDesc = descData.description_text || '';
        }

        let extractTitle = '제목 없음';
        
        if (fullDesc) {
            const separatorIdx = fullDesc.indexOf('\n---\n');
            if (separatorIdx !== -1) {
                extractTitle = fullDesc.substring(0, separatorIdx);
                descText = fullDesc.substring(separatorIdx + 5);
            } else {
                extractTitle = fullDesc.length > 20 ? fullDesc.substring(0, 20) + '...' : fullDesc;
                descText = fullDesc;
            }
        }

        return {
            id: String(media.media_id), // 프론트엔드 호환성을 위해 BIGINT를 문자열로 변환
            url: media.file_url || '',
            title: extractTitle,
            description: descText,
            location: loc?.address_text || 'Unknown',
            lat: loc?.lat,
            lng: loc?.lon,
            date: media.take_time ? new Date(media.take_time).toLocaleDateString() : new Date().toLocaleDateString(), // taken_time -> take_time
            tags: cat && cat.name ? cat.name.split(',').map(t => t.trim()).filter(Boolean) : [],
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

    const updateCategory = async (oldName: string, newName: string) => {
        if (!user) return false;
        try {
            const { error } = await supabase
                .from('category')
                .update({ name: newName })
                .eq('user_id', user.id)
                .eq('name', oldName);

            if (error) throw error;

            // 로컬 상태 동기화
            setCategories(prev => prev.map(c => c === oldName ? newName : c));
            setPhotos(prev => prev.map(p => p.category === oldName ? { ...p, category: newName } : p));
            toast.success("앨범 이름이 수정되었습니다.");
            return true;
        } catch (error: any) {
            console.error('카테고리 업데이트 중 오류:', error);
            toast.error(`업데이트 실패: ${error.message}`);
            return false;
        }
    };

    const deleteCategory = async (categoryName: string) => {
        if (!user) return false;
        try {
            const { error } = await supabase
                .from('category')
                .delete()
                .eq('user_id', user.id)
                .eq('name', categoryName);

            if (error) throw error;

            // 로컬 상태 동기화 (사진들은 DB에서 ON DELETE SET NULL 처리되었지만, 클라이언트에서 바로 Uncategorized로 보이게 함)
            setCategories(prev => prev.filter(c => c !== categoryName));
            setPhotos(prev => prev.map(p => p.category === categoryName ? { ...p, category: '' } : p));
            toast.success("앨범이 삭제되었습니다.");
            return true;
        } catch (error: any) {
            console.error('카테고리 삭제 중 오류:', error);
            toast.error(`삭제 실패: ${error.message}`);
            return false;
        }
    };

    const addPhoto = async (photo: Photo, _file: File | null, meta: { title?: string, folder: string, description: string, tags: string, lat?: number, lng?: number, address?: string }) => {
        const toastId = toast.loading("데이터베이스에 저장 중...");
        try {
            await addPhotoInternal(photo, meta);
            if (user?.id) {
                fetchPhotos(user.id);
                fetchCategories(user.id);
            }
            toast.success("사진 업로드 완료!", { id: toastId });
        } catch (error: any) {
            console.error('사진 추가 중 오류:', error);
            toast.error(`업로드 실패: ${error.message}`, { id: toastId });
        }
    };

    const addPhotos = async (items: { photo: Photo, meta: { title?: string, folder: string, description: string, tags: string, lat?: number, lng?: number, address?: string } }[]) => {
        const toastId = toast.loading(`${items.length}개의 사진을 저장 중...`);
        let successCount = 0;
        try {
            for (const item of items) {
                await addPhotoInternal(item.photo, item.meta);
                successCount++;
            }
            if (user?.id) {
                await Promise.all([
                    fetchPhotos(user.id),
                    fetchCategories(user.id)
                ]);
            }
            toast.success(`${successCount}개의 사진 업로드 완료!`, { id: toastId });
        } catch (error: any) {
            console.error('일괄 사진 추가 중 오류:', error);
            toast.error(`일부 업로드 실패 (${successCount}개 성공): ${error.message}`, { id: toastId });
        }
    };

    const addPhotoInternal = async (photo: Photo, meta: { title?: string, folder: string, description: string, tags: string, lat?: number, lng?: number, address?: string }) => {
        if (!user || !user.id) {
            throw new Error("사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.");
        }
        const userId = user.id;

        // 좌표 반올림 (numeric field overflow 방지 및 불필요한 정밀도 제거)
        const roundedLat = meta.lat ? Number(meta.lat.toFixed(7)) : 0;
        const roundedLng = meta.lng ? Number(meta.lng.toFixed(7)) : 0;

        const { data: locData, error: locError } = await supabase
            .from('location')
            .insert({
                user_id: userId,
                lat: roundedLat,
                lon: roundedLng,
                address_text: meta.address || 'Unknown',
                created_time: new Date().toISOString()
            })
            .select()
            .single();

        if (locError) {
            throw new Error(`위치 저장 실패: ${locError.message}`);
        }

        // 2. CATEGORY 추가/조회
        let categoryId: number;
        const { data: existingCat } = await supabase
            .from('category')
            .select('category_id')
            .eq('name', meta.folder)
            .eq('user_id', userId)
            .maybeSingle();

        if (existingCat) {
            categoryId = existingCat.category_id;
        } else {
            const { data: newCat, error: catInsertError } = await supabase
                .from('category')
                .insert({ name: meta.folder, user_id: userId })
                .select()
                .single();

            if (catInsertError || !newCat) {
                throw new Error(`카테고리 생성 실패: ${catInsertError?.message}`);
            }
            categoryId = newCat.category_id;
        }

        // 3. MEDIA 추가
        const { data: mediaData, error: mediaError } = await supabase
            .from('media')
            .insert({
                user_id: userId,
                category_id: categoryId,
                location_id: locData.location_id,
                media_type: 'IMAGE',
                file_url: photo.url,
                take_time: photo.date || new Date().toISOString(),
                created_time: new Date().toISOString()
            })
            .select()
            .single();

        if (mediaError) {
            throw new Error(`미디어 저장 실패: ${mediaError.message}`);
        }

        // 4. MEDIA_DESCRIPTION 추가
        if (meta.description || meta.title) {
            const finalDescription = meta.title ? `${meta.title}\n---\n${meta.description || ''}` : meta.description || '';
            const { error: descError } = await supabase
                .from('media_description')
                .insert({
                    media_id: mediaData.media_id,
                    description_text: finalDescription
                });

            if (descError) {
                console.warn('미디어 설명 저장 실패:', descError);
            }
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
    const checkIsFavorite = async (userId: string, mediaId: number) => {
        const { data } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', userId)
            .eq('media_id', mediaId)
            .single();
        return !!data;
    };

    const toggleFavoriteDB = async (userId: string, mediaId: number, isCurrentlyFavorite: boolean) => {
        if (isCurrentlyFavorite) {
            // 삭제
            const { error } = await supabase.from('favorites')
                .delete()
                .match({ user_id: userId, media_id: mediaId });
            if (error) throw error;
        } else {
            // 추가
            const { error } = await supabase.from('favorites')
                .insert([{ user_id: userId, media_id: mediaId }]);
            if (error) throw error;
        }
    };

    const toggleFavorite = async (id: string) => {
        const mediaId = Number(id); // id를 DB PK 형식(숫자)으로 변환

        // 1. 화면 즉시 변경 (Optimistic Update)
        setPhotos(prev => prev.map(p =>
            p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
        ));

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return; // 로그인 안 됨

            const targetPhoto = photos.find(p => p.id === id);
            const isCurrentlyFavorite = targetPhoto?.isFavorite || false;

            // 2. DB 통신 수행
            await toggleFavoriteDB(session.user.id, mediaId, isCurrentlyFavorite);
        } catch (error) {
            console.error('즐겨찾기 실패:', error);
            // 3. 실패 시 원래대로 롤백
            setPhotos(prev => prev.map(p =>
                p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
            ));
        }
    };
    const updatePhotoCategory = async (id: string, newCategoryName: string) => {
        if (!user) return false;
        try {
            let categoryId: number | null = null;

            if (newCategoryName && newCategoryName !== 'Uncategorized') {
                const { data } = await supabase
                    .from('category')
                    .select('category_id')
                    .eq('name', newCategoryName)
                    .eq('user_id', user.id)
                    .single();
                if (data) categoryId = data.category_id;
            }
            const { error } = await supabase
                .from('media')
                .update({ category_id: categoryId })
                .eq('media_id', id);
            if (error) throw error;
            // 로컬 상태 업데이트
            setPhotos(prev => prev.map(p =>
                p.id === id ? { ...p, category: newCategoryName || 'Uncategorized', tags: newCategoryName ? [newCategoryName] : [] } : p
            ));
            toast.success("앨범이 이동되었습니다.");
            return true;
        } catch (error) {
            console.error('앨범 이동 실패:', error);
            toast.error("앨범 이동에 실패했습니다.");
            return false;
        }
    };

    const updatePhotoDescription = async (id: string, newDescription: string, newTitle?: string) => {
        if (!user) return false;
        try {
            const finalDescription = newTitle ? `${newTitle}\n---\n${newDescription}` : newDescription;

            // media_description 테이블은 media_id가 PK이므로 upsert 사용
            const { error } = await supabase
                .from('media_description')
                .upsert({
                    media_id: Number(id),
                    description_text: finalDescription,
                    edited_time: new Date().toISOString()
                });

            if (error) throw error;

            // 로컬 상태 업데이트
            setPhotos(prev => prev.map(p =>
                p.id === id ? { 
                    ...p, 
                    description: newDescription, 
                    title: newTitle || (newDescription.length > 20 ? newDescription.substring(0, 20) + '...' : newDescription) 
                } : p
            ));
            toast.success("설명이 수정되었습니다.");
            return true;
        } catch (error) {
            console.error('설명 수정 실패:', error);
            toast.error("설명 수정에 실패했습니다.");
            return false;
        }
    };


    const batchDeletePhotos = async (ids: string[]) => {
        if (!user) return false;
        try {
            const { error } = await supabase
                .from('media')
                .delete()
                .in('media_id', ids.map(id => Number(id)));
            
            if (error) throw error;

            setPhotos(prev => prev.filter(p => !ids.includes(p.id)));
            toast.success(`${ids.length}개의 사진이 삭제되었습니다.`);
            return true;
        } catch (error: any) {
            console.error('일괄 삭제 실패:', error);
            toast.error(`삭제 실패: ${error.message}`);
            return false;
        }
    };

    const batchMovePhotos = async (ids: string[], categoryName: string) => {
        if (!user) return false;
        try {
            let categoryId: number | null = null;
            if (categoryName !== 'Uncategorized') {
                const { data: catData } = await supabase
                    .from('category')
                    .select('category_id')
                    .eq('name', categoryName)
                    .eq('user_id', user.id)
                    .maybeSingle();
                
                if (catData) {
                    categoryId = catData.category_id;
                } else {
                    // Create it if it doesn't exist
                    const { data: newCat, error: catError } = await supabase
                        .from('category')
                        .insert({ name: categoryName, user_id: user.id })
                        .select()
                        .single();
                    if (catError) throw catError;
                    if (newCat) categoryId = newCat.category_id;
                    
                    // Add to local categories state
                    setCategories(prev => prev.includes(categoryName) ? prev : [...prev, categoryName]);
                }
            }

            const { error } = await supabase
                .from('media')
                .update({ category_id: categoryId })
                .in('media_id', ids.map(id => Number(id)));

            if (error) throw error;

            setPhotos(prev => prev.map(p => 
                ids.includes(p.id) ? { ...p, category: categoryName, tags: [categoryName] } : p
            ));
            toast.success(`${ids.length}개의 사진이 ${categoryName} 앨범으로 이동되었습니다.`);
            return true;
        } catch (error: any) {
            console.error('일괄 이동 실패:', error);
            toast.error(`이동 실패: ${error.message}`);
            return false;
        }
    };

    const batchDeleteCategories = async (names: string[]) => {
        if (!user) return false;
        try {
            const { error } = await supabase
                .from('category')
                .delete()
                .in('name', names)
                .eq('user_id', user.id);
            
            if (error) throw error;

            setCategories(prev => prev.filter(c => !names.includes(c)));
            // 사진들의 카테고리 로컬 동기화
            setPhotos(prev => prev.map(p => names.includes(p.category) ? { ...p, category: '' } : p));
            toast.success(`${names.length}개의 앨범이 삭제되었습니다.`);
            return true;
        } catch (error: any) {
            console.error('일괄 앨범 삭제 실패:', error);
            toast.error(`삭제 실패: ${error.message}`);
            return false;
        }
    };

    return (
        <PhotoContext.Provider value={{
            photos,
            categories,
            addPhoto,
            addPhotos,
            deletePhoto,
            toggleFavorite,
            toggleFavoriteDB,
            addCategory,
            updateCategory,
            updatePhotoCategory,
            updatePhotoDescription,
            batchDeletePhotos,
            batchMovePhotos,
            batchDeleteCategories,
            deleteCategory,
            checkIsFavorite
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
