// 프론트엔드 인터페이스 (UI 호환성을 위해 유지)
export interface Photo {
    id: string; // media_id에 매핑
    url: string; // file_url에 매핑
    title: string; // 설명의 앞부분이나 커스텀 제목에 매핑
    description?: string; // description_text에 매핑
    location: string; // address_text에 매핑
    lat?: number; // DBLocation.lat에 매핑
    lng?: number; // DBLocation.lon에 매핑
    date: string; // take_time에 매핑
    tags: string[]; // DBCategory.name에 매핑 (호환성을 위해 배열로 유지)
    category: string; // 주 카테고리
    isFavorite: boolean; // ERD에 없음, 로컬 상태로 유지하거나 추후 추가 필요. 일단은 false 기본값.
    aspectRatio?: string;
}

// 카테고리는 프론트엔드 단순화를 위해 단순히 문자열로 처리하거나 객체로 유지 가능
// 기존 코드는 태그를 위해 'string'을 자주 사용하므로, 유연하게 유지합니다.
export type Category = string;

// 데이터베이스 인터페이스 (ER 다이어그램 기반 - 최적화된 스키마)

export interface DBUser {
    user_id: string; // UUID (기본키)
    email: string;
    password?: string;
    created_time?: string; // TIMESTAMPTZ (시간대 포함 타임스탬프)
    last_login?: string; // TIMESTAMPTZ
}

export interface DBCategory {
    category_id: number; // BIGINT
    user_id?: string | null; // users 테이블 외래키
    name: string;
    icon_url?: string | null;
    sort?: number | null;
    created_time?: string;
}

export interface DBLocationCluster {
    cluster_id: number; // BIGINT
    user_id?: string | null; // FK to users
    center_lat?: number; // DECIMAL
    center_lon?: number; // DECIMAL
    radius_meters?: number;
    created_time?: string;
}

export interface DBLocation {
    location_id: number; // BIGINT
    cluster_id?: number | null; // FK to location_cluster
    lat: number; // DECIMAL
    lon: number; // DECIMAL
    country_code?: string | null; // CHAR(2)
    address_text?: string | null;
    created_time?: string;
}

export interface DBMediaDescription {
    media_id: number; // BIGINT (PK, FK to media)
    description_text?: string | null;
    edited_time?: string;
}

export interface DBMedia {
    media_id: number; // BIGINT
    user_id?: string | null; // FK to users
    category_id?: number | null; // FK to category
    location_id?: number | null; // FK to location
    media_type?: string; // VARCHAR(50)
    file_url: string;
    thumbnail_url?: string | null;
    file_size?: number | null; // BIGINT
    take_time?: string; // TIMESTAMPTZ
    created_time?: string; // TIMESTAMPTZ
    edited_time?: string; // TIMESTAMPTZ

    // Join된 필드 (Supabase join 쿼리 결과)
    location?: DBLocation; // 소문자 별칭(alias)
    category?: DBCategory; // 소문자 별칭(alias)
    media_description?: DBMediaDescription; // 소문자 별칭(alias)
}

export interface PhotoContextType {
    photos: Photo[];
    categories: string[];
    addPhoto: (photo: Photo, file: File | null, meta: { title?: string, folder: string, description: string, tags: string, lat?: number, lng?: number, address?: string }) => Promise<void>;
    addPhotos: (items: { photo: Photo, meta: { title?: string, folder: string, description: string, tags: string, lat?: number, lng?: number, address?: string } }[]) => Promise<void>;
    toggleFavorite: (id: string) => void;
    toggleFavoriteDB: (userId: string, mediaId: number, isCurrentlyFavorite: boolean) => Promise<void>;
    checkIsFavorite: (userId: string, mediaId: number) => Promise<boolean>;
    addCategory: (category: string) => void;
    updateCategory: (oldName: string, newName: string) => Promise<boolean>;
    updatePhotoCategory: (id: string, newCategoryName: string) => Promise<boolean>;
    updatePhotoDescription: (id: string, newDescription: string, newTitle?: string) => Promise<boolean>;
    batchDeletePhotos: (ids: string[]) => Promise<boolean>;
    batchMovePhotos: (ids: string[], categoryName: string) => Promise<boolean>;
    batchDeleteCategories: (names: string[]) => Promise<boolean>;
    deleteCategory: (categoryName: string) => Promise<boolean>;
    deletePhoto: (id: string) => void;
}