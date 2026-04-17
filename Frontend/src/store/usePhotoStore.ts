import { create } from 'zustand';
import { Photo, DBMedia } from '../type';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';

interface PhotoStore {
    // [State] 전역적으로 사용되는 데이터
    photos: Photo[];           // PhotoFeed, Map, Timeline, Globe 등 대부분의 뷰에서 사용
    categories: string[];    // Sidebar, UploadScreen, AlbumsView에서 사용
    isInitialized: boolean;   // 초기화 로딩 상태 제어
    
    // [Actions] 데이터 초기화 및 조회
    initialize: (userId: string) => Promise<void>;      // App.tsx 진입 시 호출
    fetchCategories: (userId: string) => Promise<void>; // 카테고리 목록 동기화
    fetchPhotos: (userId: string) => Promise<void>;     // 사진 데이터 동기화
    
    // [Actions] 사진 업로드 및 관리
    addPhoto: (photo: Photo, file: File | null, meta: { title?: string, folder: string, description: string, tags: string, lat?: number, lng?: number, address?: string }) => Promise<void>; // UploadScreen
    addPhotos: (items: { photo: Photo, meta: { title?: string, folder: string, description: string, tags: string, lat?: number, lng?: number, address?: string } }[]) => Promise<void>;    // UploadScreen (일괄 업로드)
    deletePhoto: (id: string) => Promise<void>;         // PhotoFeed (상세보기/삭제)
    
    // [Actions] 즐겨찾기 관리
    toggleFavorite: (id: string) => Promise<void>;      // PhotoFeed (하트 버튼)
    toggleFavoriteDB: (userId: string, media_id: number, isCurrentlyFavorite: boolean) => Promise<void>;
    
    // [Actions] 카테고리(앨범) 관리
    addCategory: (name: string) => void;                // UploadScreen, Sidebar
    updateCategory: (oldName: string, newName: string) => Promise<boolean>;   // AlbumsView (앨범명 수정)
    deleteCategory: (categoryName: string) => Promise<boolean>;               // AlbumsView (앨범 삭제)
    
    // [Actions] 사진 속성 수정
    updatePhotoCategory: (id: string, newCategoryName: string) => Promise<boolean>;       // PhotoFeed (앨범 이동)
    updatePhotoDescription: (id: string, newDescription: string, newTitle?: string) => Promise<boolean>; // PhotoFeed (설명 수정)
    
    // [Actions] 일괄 작업 (선택 모드)
    batchDeletePhotos: (ids: string[]) => Promise<boolean>;     // PhotoFeed (일괄 삭제)
    batchMovePhotos: (ids: string[], categoryName: string) => Promise<boolean>; // PhotoFeed (일괄 이동)
    batchDeleteCategories: (names: string[]) => Promise<boolean>;
    
    checkIsFavorite: (userId: string, mediaId: number) => Promise<boolean>;
}

const mapMediaToPhoto = (media: DBMedia): Photo => {
    const loc = media.location;
    const cat = media.category;
    const descData = media.media_description;

    let descText = '';
    let fullDesc = '';

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
        id: String(media.media_id),
        url: media.file_url || '',
        title: extractTitle,
        description: descText,
        location: loc?.address_text || 'Unknown',
        lat: loc?.lat,
        lng: loc?.lon,
        date: media.take_time ? new Date(media.take_time).toLocaleDateString() : new Date().toLocaleDateString(),
        tags: cat && cat.name ? cat.name.split(',').map(t => t.trim()).filter(Boolean) : [],
        category: cat?.name || '기타',
        isFavorite: false,
        aspectRatio: 'h-[400px]'
    };
};

const getUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user.id) {
        throw new Error("사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.");
    }
    return session.user.id;
};

export const usePhotoStore = create<PhotoStore>((set, get) => ({
    photos: [],
    categories: [],
    isInitialized: false,

    initialize: async (userId: string) => {
        if (get().isInitialized) return;
        set({ isInitialized: true });
        await Promise.all([
            get().fetchCategories(userId),
            get().fetchPhotos(userId)
        ]);
    },

    fetchCategories: async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('category')
                .select('name')
                .eq('user_id', userId)
                .order('name');

            if (error) throw error;

            if (data) {
                const uniqueNames = Array.from(new Set(data.map(c => c.name)));
                set({ categories: uniqueNames });
            }
        } catch (error) {
            console.error('카테고리 불러오기 실패:', error);
            toast.error('앙범 목록을 불러오지 못했습니다.');
        }
    },

    fetchPhotos: async (userId: string) => {
        try {
            const mediaPromise = supabase
                .from('media')
                .select(`
                    *,
                    location (*),
                    category (*),
                    media_description (*)
                `)
                .eq('user_id', userId)
                .order('created_time', { ascending: false });

            const favPromise = supabase
                .from('favorites')
                .select('media_id')
                .eq('user_id', userId);

            const [mediaResponse, favResponse] = await Promise.all([mediaPromise, favPromise]);

            if (mediaResponse.error) {
                console.error('사진 불러오기 실패:', mediaResponse.error);
                return;
            }

            const favoriteIds = new Set(favResponse.data?.map(f => String(f.media_id)) || []);

            if (mediaResponse.data) {
                const loadedPhotos: Photo[] = (mediaResponse.data as unknown as DBMedia[]).map(media => {
                    const photo = mapMediaToPhoto(media);
                    return {
                        ...photo,
                        isFavorite: favoriteIds.has(photo.id)
                    };
                });
                set({ photos: loadedPhotos });
            }
        } catch (err) {
            console.error('사진 불러오기 중 예기치 못한 오류 발생:', err);
            toast.error('사진을 불러오는 중 오류가 발생했습니다. 잠시 후 새로고침 해주세요.');
        }
    },

    addCategory: (name: string) => {
        set(state => ({
            categories: state.categories.includes(name) ? state.categories : [...state.categories, name]
        }));
    },

    updateCategory: async (oldName: string, newName: string) => {
        try {
            const userId = await getUserId();
            const { error } = await supabase
                .from('category')
                .update({ name: newName })
                .eq('user_id', userId)
                .eq('name', oldName);

            if (error) throw error;

            set(state => ({
                categories: state.categories.map(c => c === oldName ? newName : c),
                photos: state.photos.map(p => p.category === oldName ? { ...p, category: newName } : p)
            }));
            toast.success("앨범 이름이 수정되었습니다.");
            return true;
        } catch (error: any) {
            console.error('카테고리 업데이트 중 오류:', error);
            toast.error(`업데이트 실패: ${error.message}`);
            return false;
        }
    },

    deleteCategory: async (categoryName: string) => {
        try {
            const userId = await getUserId();
            const { error } = await supabase
                .from('category')
                .delete()
                .eq('user_id', userId)
                .eq('name', categoryName);

            if (error) throw error;

            set(state => ({
                categories: state.categories.filter(c => c !== categoryName),
                photos: state.photos.map(p => p.category === categoryName ? { ...p, category: '' } : p)
            }));
            toast.success("앨범이 삭제되었습니다.");
            return true;
        } catch (error: any) {
            console.error('카테고리 삭제 중 오류:', error);
            toast.error(`삭제 실패: ${error.message}`);
            return false;
        }
    },

    addPhoto: async (photo: Photo, _file: File | null, meta: { title?: string, folder: string, description: string, tags: string, lat?: number, lng?: number, address?: string }) => {
        const toastId = toast.loading("데이터베이스에 저장 중...");
        try {
            const userId = await getUserId();
            
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

            if (locError) throw new Error(`위치 저장 실패: ${locError.message}`);

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

                if (catInsertError || !newCat) throw new Error(`카테고리 생성 실패: ${catInsertError?.message}`);
                categoryId = newCat.category_id;
            }

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

            if (mediaError) throw new Error(`미디어 저장 실패: ${mediaError.message}`);

            if (meta.description || meta.title) {
                const finalDescription = meta.title ? `${meta.title}\n---\n${meta.description || ''}` : meta.description || '';
                const { error: descError } = await supabase
                    .from('media_description')
                    .insert({
                        media_id: mediaData.media_id,
                        description_text: finalDescription
                    });

                if (descError) console.warn('미디어 설명 저장 실패:', descError);
            }

            await get().fetchPhotos(userId);
            await get().fetchCategories(userId);
            toast.success("사진 업로드 완료!", { id: toastId });
        } catch (error: any) {
            console.error('사진 추가 중 오류:', error);
            toast.error(`업로드 실패: ${error.message}`, { id: toastId });
        }
    },

    addPhotos: async (items: { photo: Photo, meta: { title?: string, folder: string, description: string, tags: string, lat?: number, lng?: number, address?: string } }[]) => {
        const toastId = toast.loading(`${items.length}개의 사진을 저장 중...`);
        let successCount = 0;
        try {
            const userId = await getUserId();
            for (const item of items) {
                // Internal inline add logic to avoid repeated toasts and fetches
                const roundedLat = item.meta.lat ? Number(item.meta.lat.toFixed(7)) : 0;
                const roundedLng = item.meta.lng ? Number(item.meta.lng.toFixed(7)) : 0;

                const { data: locData, error: locError } = await supabase.from('location').insert({ user_id: userId, lat: roundedLat, lon: roundedLng, address_text: item.meta.address || 'Unknown', created_time: new Date().toISOString() }).select().single();
                if (locError) throw new Error(`위치 저장 실패: ${locError.message}`);

                let categoryId: number;
                const { data: existingCat } = await supabase.from('category').select('category_id').eq('name', item.meta.folder).eq('user_id', userId).maybeSingle();
                if (existingCat) {
                    categoryId = existingCat.category_id;
                } else {
                    const { data: newCat, error: catInsertError } = await supabase.from('category').insert({ name: item.meta.folder, user_id: userId }).select().single();
                    if (catInsertError || !newCat) throw new Error(`카테고리 생성 실패: ${catInsertError?.message}`);
                    categoryId = newCat.category_id;
                }

                const { data: mediaData, error: mediaError } = await supabase.from('media').insert({ user_id: userId, category_id: categoryId, location_id: locData.location_id, media_type: 'IMAGE', file_url: item.photo.url, take_time: item.photo.date || new Date().toISOString(), created_time: new Date().toISOString() }).select().single();
                if (mediaError) throw new Error(`미디어 저장 실패: ${mediaError.message}`);

                if (item.meta.description || item.meta.title) {
                    const finalDescription = item.meta.title ? `${item.meta.title}\n---\n${item.meta.description || ''}` : item.meta.description || '';
                    const { error: descError } = await supabase.from('media_description').insert({ media_id: mediaData.media_id, description_text: finalDescription });
                    if (descError) console.warn('미디어 설명 저장 실패:', descError);
                }
                successCount++;
            }
            
            await Promise.all([get().fetchPhotos(userId), get().fetchCategories(userId)]);
            toast.success(`${successCount}개의 사진 업로드 완료!`, { id: toastId });
        } catch (error: any) {
            console.error('일괄 사진 추가 중 오류:', error);
            toast.error(`일부 업로드 실패 (${successCount}개 성공): ${error.message}`, { id: toastId });
        }
    },

    deletePhoto: async (id: string) => {
        const { error } = await supabase.from('media').delete().eq('media_id', id);
        if (!error) {
            set(state => ({ photos: state.photos.filter(p => p.id !== id) }));
        } else {
            toast.error("Failed to delete");
        }
    },

    checkIsFavorite: async (userId: string, mediaId: number) => {
        const { data } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', userId)
            .eq('media_id', mediaId)
            .single();
        return !!data;
    },

    toggleFavoriteDB: async (userId: string, mediaId: number, isCurrentlyFavorite: boolean) => {
        if (isCurrentlyFavorite) {
            const { error } = await supabase.from('favorites')
                .delete()
                .match({ user_id: userId, media_id: mediaId });
            if (error) throw error;
        } else {
            const { error } = await supabase.from('favorites')
                .insert([{ user_id: userId, media_id: mediaId }]);
            if (error) throw error;
        }
    },

    toggleFavorite: async (id: string) => {
        const mediaId = Number(id);

        // set() 호출 전에 현재(old) 상태를 캡처
        const wasAlreadyFavorite = get().photos.find(p => p.id === id)?.isFavorite ?? false;

        // 낙관적 업데이트(즉각 UI 반영)
        set(state => ({
            photos: state.photos.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p)
        }));

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // 세션 없으면 롤백
                set(state => ({
                    photos: state.photos.map(p => p.id === id ? { ...p, isFavorite: wasAlreadyFavorite } : p)
                }));
                return;
            }

            // wasAlreadyFavorite: toggle 이전의 실제 DB 상태
            await get().toggleFavoriteDB(session.user.id, mediaId, wasAlreadyFavorite);
        } catch (error) {
            // DB 실패 시 원래 상태로 롤백
            set(state => ({
                photos: state.photos.map(p => p.id === id ? { ...p, isFavorite: wasAlreadyFavorite } : p)
            }));
            console.error('즐겨찾기 실패:', error);
        }
    },

    updatePhotoCategory: async (id: string, newCategoryName: string) => {
        try {
            const userId = await getUserId();
            let categoryId: number | null = null;

            if (newCategoryName && newCategoryName !== 'Uncategorized') {
                const { data } = await supabase
                    .from('category')
                    .select('category_id')
                    .eq('name', newCategoryName)
                    .eq('user_id', userId)
                    .single();
                if (data) categoryId = data.category_id;
            }
            const { error } = await supabase
                .from('media')
                .update({ category_id: categoryId })
                .eq('media_id', id);
            if (error) throw error;
            
            set(state => ({
                photos: state.photos.map(p => p.id === id ? { ...p, category: newCategoryName || 'Uncategorized', tags: newCategoryName ? [newCategoryName] : [] } : p)
            }));
            toast.success("앨범이 이동되었습니다.");
            return true;
        } catch (error) {
            console.error('앨범 이동 실패:', error);
            toast.error("앨범 이동에 실패했습니다.");
            return false;
        }
    },

    updatePhotoDescription: async (id: string, newDescription: string, newTitle?: string) => {
        try {
            await getUserId(); // ensure logged in
            const finalDescription = newTitle ? `${newTitle}\n---\n${newDescription}` : newDescription;

            const { error } = await supabase
                .from('media_description')
                .upsert({
                    media_id: Number(id),
                    description_text: finalDescription,
                    edited_time: new Date().toISOString()
                });

            if (error) throw error;

            set(state => ({
                photos: state.photos.map(p => p.id === id ? { 
                    ...p, 
                    description: newDescription, 
                    title: newTitle || (newDescription.length > 20 ? newDescription.substring(0, 20) + '...' : newDescription) 
                } : p)
            }));
            toast.success("설명이 수정되었습니다.");
            return true;
        } catch (error) {
            console.error('설명 수정 실패:', error);
            toast.error("설명 수정에 실패했습니다.");
            return false;
        }
    },

    batchDeletePhotos: async (ids: string[]) => {
        try {
            await getUserId(); // ensure logged in
            const { error } = await supabase
                .from('media')
                .delete()
                .in('media_id', ids.map(id => Number(id)));
            
            if (error) throw error;

            set(state => ({ photos: state.photos.filter(p => !ids.includes(p.id)) }));
            toast.success(`${ids.length}개의 사진이 삭제되었습니다.`);
            return true;
        } catch (error: any) {
            console.error('일괄 삭제 실패:', error);
            toast.error(`삭제 실패: ${error.message}`);
            return false;
        }
    },

    batchMovePhotos: async (ids: string[], categoryName: string) => {
        try {
            const userId = await getUserId();
            let categoryId: number | null = null;
            if (categoryName !== 'Uncategorized') {
                const { data: catData } = await supabase
                    .from('category')
                    .select('category_id')
                    .eq('name', categoryName)
                    .eq('user_id', userId)
                    .maybeSingle();
                
                if (catData) {
                    categoryId = catData.category_id;
                } else {
                    const { data: newCat, error: catError } = await supabase
                        .from('category')
                        .insert({ name: categoryName, user_id: userId })
                        .select()
                        .single();
                    if (catError) throw catError;
                    if (newCat) categoryId = newCat.category_id;
                    
                    set(state => ({ categories: state.categories.includes(categoryName) ? state.categories : [...state.categories, categoryName] }));
                }
            }

            const { error } = await supabase
                .from('media')
                .update({ category_id: categoryId })
                .in('media_id', ids.map(id => Number(id)));

            if (error) throw error;

            set(state => ({
                photos: state.photos.map(p => ids.includes(p.id) ? { ...p, category: categoryName, tags: [categoryName] } : p)
            }));
            toast.success(`${ids.length}개의 사진이 ${categoryName} 앨범으로 이동되었습니다.`);
            return true;
        } catch (error: any) {
            console.error('일괄 이동 실패:', error);
            toast.error(`이동 실패: ${error.message}`);
            return false;
        }
    },

    batchDeleteCategories: async (names: string[]) => {
        try {
            const userId = await getUserId();
            const { error } = await supabase
                .from('category')
                .delete()
                .in('name', names)
                .eq('user_id', userId);
            
            if (error) throw error;

            set(state => ({
                categories: state.categories.filter(c => !names.includes(c)),
                photos: state.photos.map(p => names.includes(p.category) ? { ...p, category: '' } : p)
            }));
            toast.success(`${names.length}개의 앨범이 삭제되었습니다.`);
            return true;
        } catch (error: any) {
            console.error('일괄 앨범 삭제 실패:', error);
            toast.error(`삭제 실패: ${error.message}`);
            return false;
        }
    }
}));
