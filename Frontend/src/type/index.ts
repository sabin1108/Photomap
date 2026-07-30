export interface Photo {
    id: string;
    url: string;
    thumbnail_url?: string | null;
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


export interface DBCategory {
    category_id: number;
    user_id?: string | null;
    name: string;
    icon_url?: string | null;
    sort?: number | null;
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
