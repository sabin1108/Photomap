export interface Photo {
    id: string;
    url: string;
    title: string;
    description?: string;
    location: string;
    lat?: number;
    lng?: number;
    date: string;
    tags: string[];
    category: string;
    isFavorite: boolean;
    aspectRatio?: string;
}

export type Category = string;


export interface DBUser {
    user_id: string;
    email: string;
    password?: string;
    created_time?: string;
    last_login?: string;
}

export interface DBCategory {
    category_id: number;
    user_id?: string | null;
    name: string;
    icon_url?: string | null;
    sort?: number | null;
    created_time?: string;
}

export interface DBLocationCluster {
    cluster_id: number;
    user_id?: string | null;
    center_lat?: number;
    center_lon?: number;
    radius_meters?: number;
    created_time?: string;
}

export interface DBLocation {
    location_id: number;
    cluster_id?: number | null;
    lat: number;
    lon: number;
    country_code?: string | null;
    address_text?: string | null;
    created_time?: string;
}

export interface DBMediaDescription {
    media_id: number;
    description_text?: string | null;
    edited_time?: string;
}

export interface DBMedia {
    media_id: number;
    user_id?: string | null;
    category_id?: number | null;
    location_id?: number | null;
    media_type?: string;
    file_url: string;
    thumbnail_url?: string | null;
    file_size?: number | null;
    take_time?: string;
    created_time?: string;
    edited_time?: string;

    location?: DBLocation;
    category?: DBCategory;
    media_description?: DBMediaDescription;
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