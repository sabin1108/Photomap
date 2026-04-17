import { X, Camera, FolderPlus, Search, MapPin, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import React, { useState, useRef, ChangeEvent } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';

import { usePhotoStore } from '../store/usePhotoStore';
import { Photo } from '../type';
import { supabase } from '../lib/supabaseClient';
import exifr from 'exifr';
interface UploadScreenProps {
  onClose: () => void;
  initialLocation?: string;
  initialCategory?: string;
}

const LocationSearch = React.memo(function LocationSearch({
  value,
  onChangeText,
  onSelectPlace,
  placeholder,
  className
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSelectPlace: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  className?: string;
}) {
  const [internalValue, setInternalValue] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 부모 컴포넌트에서 값이 강제로 업데이트될 경우 내부 상태 동기화
  // 동일한 값으로 인한 무한 루프 방지를 위해 ref를 사용합니다.
  const prevValueRef = useRef(value);
  if (value !== prevValueRef.current) {
    prevValueRef.current = value;
    setInternalValue(value);
  }

  const fetchSuggestions = (q: string) => {
    setInternalValue(q); // 60fps의 부드러운 타이핑 반응을 위해 로컬 State만 즉시 업데이트

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!q || q.length < 2) {
      setSuggestions([]);
      onChangeText(q); // 입력 내용이 비워지면 부모 컴포넌트에 즉시 반영
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      onChangeText(q); // 타이핑이 멈춘 후 (debounced) 부모 컴포넌트와 동기화
      setIsSearching(true);
      try {
        const KAKAO_KEY = import.meta.env.VITE_KAKAO_MAP_API_KEY || import.meta.env.VITE_KAKAO_MAP;
        const headers = { Authorization: `KakaoAK ${KAKAO_KEY}` };

        // 1. 키워드 검색 (장소명 위주)
        const keywordResp = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=5`, { headers });
        if (!keywordResp.ok) {
          const errData = await keywordResp.json();
          toast.error(`카카오 API 인증 오류: ${errData.message || '키 또는 도메인 설정 확인 필요'}`);
          return;
        }
        const keywordData = await keywordResp.json();
        let results = keywordData.documents || [];

        // 2. 키워드 검색 결과가 없으면 상세 주소 검색 시도
        if (results.length === 0) {
          const addressResp = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}&size=5`, { headers });
          if (!addressResp.ok) {
            const errData = await addressResp.json();
            toast.error(`카카오 API 주소 오류: ${errData.message}`);
            return;
          }
          const addressData = await addressResp.json();
          results = addressData.documents || [];
        }

        setSuggestions(results);
      } catch (err) {
        console.error("Kakao Geocoding failed", err);
        toast.error("카카오 지도 API 통신 중 문제가 발생했습니다.");
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <Input
          placeholder={placeholder || "Search location..."}
          className={cn("pl-10 text-sm bg-white border-stone-200 focus:border-[#E09F87] transition-colors", className)}
          value={internalValue}
          onChange={(e) => fetchSuggestions(e.target.value)}
        />
        {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-[#E09F87] border-t-transparent rounded-full animate-spin" />}
      </div>
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-100 rounded-xl shadow-lg overflow-hidden z-[60] max-h-48 overflow-y-auto custom-scrollbar">
          {suggestions.map((s: any) => (
            <button
              key={s.id}
              className="w-full px-3 py-2 text-left hover:bg-stone-50 border-b border-stone-50 last:border-0 flex items-start gap-2 transition-colors"
              onClick={() => {
                const displayName = s.place_name || s.address_name;
                onChangeText(displayName);
                setSuggestions([]);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                onSelectPlace(displayName, parseFloat(s.y), parseFloat(s.x));
              }}
            >
              <MapPin className="w-3 h-3 mt-1 text-[#E09F87] shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-stone-800 truncate">{s.place_name || s.address_name}</div>
                {s.place_name && <div className="text-[10px] text-stone-400 truncate">{s.address_name}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
LocationSearch.displayName = "LocationSearch";

const CustomDateTimePicker = React.memo(function CustomDateTimePicker({
  value,
  onChange
}: {
  value: string | undefined;
  onChange: (dateObj: Date | undefined) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const parsedDate = value ? new Date(value) : undefined;
  const timeStr = parsedDate
    ? `${parsedDate.getHours().toString().padStart(2, '0')}:${parsedDate.getMinutes().toString().padStart(2, '0')}`
    : '12:00';

  const [time, setTime] = useState(timeStr);

  const hours = parsedDate ? parsedDate.getHours() : parseInt(time.split(':')[0]);
  const minutes = parsedDate ? parsedDate.getMinutes() : parseInt(time.split(':')[1]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      onChange(undefined);
      return;
    }
    const newDate = new Date(selectedDate);
    newDate.setHours(hours, minutes, 0, 0);
    onChange(newDate);
  };

  const handleTimePartChange = (type: 'ampm' | 'h12' | 'm', val: string) => {
    let currentH24 = hours;
    let currentM = minutes;
    let isPM = currentH24 >= 12;
    let currentH12 = currentH24 % 12 === 0 ? 12 : currentH24 % 12;

    if (type === 'ampm') {
      isPM = val === 'PM';
    } else if (type === 'h12') {
      currentH12 = parseInt(val, 10);
    } else if (type === 'm') {
      currentM = parseInt(val, 10);
    }

    let newH24 = currentH12;
    if (isPM && currentH12 < 12) newH24 += 12;
    if (!isPM && currentH12 === 12) newH24 = 0;

    const newTime = `${newH24.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`;
    setTime(newTime);

    if (parsedDate) {
      const newD = new Date(parsedDate);
      newD.setHours(newH24, currentM, 0, 0);
      onChange(newD);
    }
  };

  const displayString = parsedDate
    ? `${parsedDate.getFullYear()}년 ${parsedDate.getMonth() + 1}월 ${parsedDate.getDate()}일 ${hours >= 12 ? '오후' : '오전'} ${hours % 12 === 0 ? 12 : hours % 12}:${minutes.toString().padStart(2, '0')}`
    : '날짜 및 시간 선택';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative flex items-center group w-full cursor-pointer">
          <CalendarIcon className="absolute left-3 w-4 h-4 text-stone-400 group-hover:text-[#E09F87] transition-colors pointer-events-none z-10" />
          <div className="h-9 w-full flex items-center pl-9 pr-3 text-sm bg-white border border-stone-200 group-hover:border-[#E09F87] transition-colors text-stone-600 rounded-lg shadow-sm">
            {displayString}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-stone-100 shadow-xl overflow-hidden rounded-xl" align="start">
        <Calendar
          mode="single"
          selected={parsedDate}
          onSelect={handleDateSelect}
          initialFocus
          className="bg-white"
          classNames={{
            day_selected: "bg-[#E09F87] text-white hover:bg-[#E09F87] hover:text-white focus:bg-[#E09F87] focus:text-white",
            day_today: "text-[#E09F87] font-bold"
          }}
        />
        <div className="p-3 bg-stone-50 flex items-center justify-between border-t border-stone-100">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Time</span>
          <div className="flex items-center gap-1.5 isolate">
            <Select value={hours >= 12 ? 'PM' : 'AM'} onValueChange={(v: string) => handleTimePartChange('ampm', v)}>
              <SelectTrigger className="w-[65px] h-8 text-xs bg-white border-stone-200 focus:ring-1 focus:ring-[#E09F87]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-stone-200 shadow-lg z-[100]">
                <SelectItem value="AM" className="text-xs focus:bg-[#E09F87]/10 focus:text-[#E09F87]">오전</SelectItem>
                <SelectItem value="PM" className="text-xs focus:bg-[#E09F87]/10 focus:text-[#E09F87]">오후</SelectItem>
              </SelectContent>
            </Select>
            <Select value={(hours % 12 === 0 ? 12 : hours % 12).toString()} onValueChange={(v: string) => handleTimePartChange('h12', v)}>
              <SelectTrigger className="w-[60px] h-8 text-xs bg-white border-stone-200 focus:ring-1 focus:ring-[#E09F87]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-stone-200 shadow-lg max-h-[200px] z-[100]">
                {Array.from({ length: 12 }).map((_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()} className="text-xs focus:bg-[#E09F87]/10 focus:text-[#E09F87]">
                    {(i + 1).toString().padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-stone-400 font-bold">:</span>
            <Select value={minutes.toString()} onValueChange={(v: string) => handleTimePartChange('m', v)}>
              <SelectTrigger className="w-[60px] h-8 text-xs bg-white border-stone-200 focus:ring-1 focus:ring-[#E09F87]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-stone-200 shadow-lg max-h-[200px] z-[100]">
                {Array.from({ length: 60 }).map((_, i) => (
                  <SelectItem key={i} value={i.toString()} className="text-xs focus:bg-[#E09F87]/10 focus:text-[#E09F87]">
                    {i.toString().padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});
CustomDateTimePicker.displayName = "CustomDateTimePicker";

export type UploadItem = {
  file: File;
  preview: string;
  exif: { lat?: number, lng?: number, takeTime?: string };
  title: string;
  description: string;
  tags: string;
  address: string;
  customDate?: string;
  customLat?: number;
  customLng?: number;
  status: 'idle' | 'uploading' | 'done' | 'error';
};

const UploadPhotoItem = React.memo(({
  item,
  idx,
  updateFileDetail,
  updateFileLocation
}: {
  item: UploadItem;
  idx: number;
  updateFileDetail: (index: number, field: 'title' | 'description' | 'tags' | 'address' | 'customDate', value: string) => void;
  updateFileLocation: (index: number, address: string, lat: number, lng: number) => void;
}) => {
  return (
    <div className="relative focus-within:z-20 flex flex-col sm:flex-row gap-4 p-4 border border-stone-100 rounded-2xl bg-stone-50 transition-colors focus-within:border-[#E09F87]/50 focus-within:bg-[#E09F87]/5">
      <div className="w-full sm:w-24 h-48 sm:h-24 shrink-0 rounded-xl overflow-hidden relative shadow-sm">
        <ImageWithFallback src={item.preview} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
        {item.exif.lat && (
          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-md text-[10px] px-2 py-1 rounded-full flex items-center gap-1 shadow-sm font-medium text-stone-700">
            <MapPin className="w-3 h-3 text-[#E09F87]" /> GPS
          </div>
        )}
      </div>
      <div className="flex-1 space-y-3">
        <Input
          placeholder={`Title for ${item.file.name}`}
          className="h-9 text-sm bg-white border-stone-200 focus:border-[#E09F87] transition-colors"
          value={item.title}
          onChange={(e) => updateFileDetail(idx, 'title', e.target.value)}
        />
        <Textarea
          placeholder={`Description for ${item.file.name}`}
          className="h-16 text-sm bg-white border-stone-200 focus:border-[#E09F87] resize-none transition-colors"
          value={item.description}
          onChange={(e) => updateFileDetail(idx, 'description', e.target.value)}
        />
        <Input
          placeholder="Tags (Comma separated, e.g. @sunset, @bridge)"
          className="h-9 text-sm bg-white border-stone-200 focus:border-[#E09F87] transition-colors"
          value={item.tags}
          onChange={(e) => updateFileDetail(idx, 'tags', e.target.value)}
        />
        <CustomDateTimePicker
          value={item.customDate}
          onChange={(dateObj) => {
            if (dateObj) {
              updateFileDetail(idx, 'customDate', dateObj.toISOString());
            } else {
              updateFileDetail(idx, 'customDate', '');
            }
          }}
        />
        <LocationSearch
          value={item.address}
          onChangeText={(text) => updateFileDetail(idx, 'address', text)}
          placeholder="Search or enter detailed address"
          className="h-9"
          onSelectPlace={(address, lat, lng) => updateFileLocation(idx, address, lat, lng)}
        />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.item === nextProps.item && prevProps.idx === nextProps.idx;
});
UploadPhotoItem.displayName = "UploadPhotoItem";

export function UploadScreen({ onClose, initialLocation, initialCategory }: UploadScreenProps) {
  const addPhotos = usePhotoStore(state => state.addPhotos);
  const categories = usePhotoStore(state => state.categories);
  const [selectedFiles, setSelectedFiles] = useState<UploadItem[]>([]);
  const [folderName, setFolderName] = useState<string>(initialCategory || 'places');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const [batchTitle, setBatchTitle] = useState('');
  const [batchDescription, setBatchDescription] = useState('');
  const [address, setAddress] = useState(initialLocation || '');
  const [isBatchOpen, setIsBatchOpen] = useState(!!initialLocation);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);

      // 파일 유효성 검사
      const MAX_SIZE_MB = 20;
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif'];
      const oversized = files.filter(f => f.size > MAX_SIZE_MB * 1024 * 1024);
      const invalidType = files.filter(f => !ALLOWED_TYPES.includes(f.type.toLowerCase()));

      if (invalidType.length > 0) {
        toast.error(`지원하지 않는 파일 형식입니다: ${invalidType.map(f => f.name).join(', ')}`);
        e.target.value = '';
        return;
      }
      if (oversized.length > 0) {
        toast.error(`파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다: ${oversized.map(f => f.name).join(', ')}`);
        e.target.value = '';
        return;
      }

      const newFiles = await Promise.all(files.map(async (file) => {
        const objectUrl = URL.createObjectURL(file);
        let exif: { lat?: number, lng?: number, takeTime?: string } = {};
        try {
          const parsed = await exifr.parse(file);
          exif = {
            lat: parsed?.latitude,
            lng: parsed?.longitude,
            takeTime: parsed?.DateTimeOriginal ? new Date(parsed.DateTimeOriginal).toISOString() : undefined
          };
        } catch (err) {
          console.warn("EXIF 정보를 읽을 수 없습니다.", err);
        }
        return {
          file,
          preview: objectUrl,
          exif,
          title: '',
          description: '',
          tags: '',
          address: '',
          customDate: exif.takeTime || new Date().toISOString(),
          status: 'idle' as const
        };
      }));

      setSelectedFiles(prev => [...prev, ...newFiles]);
      e.target.value = ''; // 같은 파일 재선택 허용
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const updateFileDetail = (index: number, field: 'title' | 'description' | 'tags' | 'address' | 'customDate', value: string) => {
    setSelectedFiles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateFileLocation = (index: number, address: string, lat: number, lng: number) => {
    setSelectedFiles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], address, customLat: lat, customLng: lng };
      return updated;
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handlePost = async () => {
    if (selectedFiles.length === 0) {
      toast.error("사진을 선택해주세요");
      return;
    }

    if (!folderName.trim()) {
      toast.error("태그 이름을 입력해주세요 (예: 여행, @음식)");
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: selectedFiles.length });

    const uploadItems: { photo: Photo, meta: any }[] = [];
    let failCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const item = selectedFiles[i];
      setUploadProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const safeDir = 'uploads';
        const fileName = `${Date.now()}_${item.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
        const filePath = `${safeDir}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, item.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath);

        const rawFolder = folderName.trim();
        const batchTags = rawFolder.split(',').map(t => t.trim().replace(/^@+/, '')).filter(Boolean);
        const itemTags = (item.tags || '').split(',').map(t => t.trim().replace(/^@+/, '')).filter(Boolean);
        const mergedTags = Array.from(new Set([...batchTags, ...itemTags]));
        const normalizedTagStr = mergedTags.join(', ');

        const tempPhoto: Photo = {
          id: crypto.randomUUID(),
          url: publicUrl,
          title: item.title || batchTitle || item.file.name,
          location: "Unknown",
          date: item.customDate || item.exif.takeTime || new Date().toISOString(),
          tags: mergedTags,
          category: normalizedTagStr,
          isFavorite: false
        };

        uploadItems.push({
          photo: tempPhoto,
          meta: {
            title: item.title || batchTitle,
            folder: normalizedTagStr,
            description: item.description || batchDescription,
            tags: normalizedTagStr,
            lat: item.customLat || item.exif.lat,
            lng: item.customLng || item.exif.lng,
            address: item.address || address || 'Unknown'
          }
        });

      } catch (error: any) {
        console.error(`Upload failed for ${item.file.name}:`, error);
        failCount++;
      }
    }

    if (uploadItems.length > 0) {
      await addPhotos(uploadItems);
    }

    setIsUploading(false);

    if (failCount === 0) {
      toast.success(`${uploadItems.length}장의 사진이 업로드되었습니다! 🎉`);
      setTimeout(onClose, 1200);
    } else if (uploadItems.length > 0) {
      toast.warning(`${uploadItems.length}장 업로드 성공, ${failCount}장 실패했습니다.`);
    } else {
      toast.error('모든 사진 업로드에 실패했습니다. 네트워크 상태를 확인해 주세요.');
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#F9F8F6] flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 bg-white/50 backdrop-blur-md sticky top-0 z-10 border-b border-stone-100">
        <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose} className="hover:bg-stone-100 rounded-full">
          <X className="w-6 h-6 text-stone-600" />
        </Button>
        <span className="font-semibold text-lg text-stone-800 text-balance">New Memory</span>
        <Button
          variant="ghost"
          className="text-terracotta-500 font-medium hover:text-terracotta-600 hover:bg-orange-50 rounded-full px-4"
          onClick={handlePost}
          disabled={isUploading}
        >
          {isUploading ? 'Posting...' : 'Post'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pb-40">



        {/* 선택 영역 */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-light text-stone-800">Select Photos</h3>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
              />
              {selectedFiles.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={triggerFileInput}
                  className="rounded-full text-xs"
                >
                  Add More
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {selectedFiles.map((item, idx) => (
              <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border border-stone-200">
                <ImageWithFallback src={item.preview} alt={`Selected ${idx}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removeFile(idx)}
                  className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
                {item.exif.lat && (
                  <div className="absolute bottom-2 left-2 bg-white/80 backdrop-blur-sm text-[8px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <MapPin className="w-2 h-2" /> GPS
                  </div>
                )}
              </div>
            ))}

            <div
              onClick={triggerFileInput}
              className={cn(
                "aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-colors cursor-pointer relative overflow-hidden group",
                "border-stone-200 hover:border-[#E09F87] hover:text-[#E09F87] text-stone-400 bg-white"
              )}
            >
              <Camera className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-xs font-medium">Add Photo</span>
            </div>
          </div>
        </section>

        {/* 편집 및 분류 (선택 시 표시) */}
        {selectedFiles.length > 0 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {isUploading && (
              <div className="bg-[#E09F87]/10 p-4 rounded-2xl border border-[#E09F87]/20">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-medium text-[#E09F87]">Uploading Photos...</span>
                  <span className="text-xs font-bold text-[#E09F87]">{uploadProgress.current} / {uploadProgress.total}</span>
                </div>
                <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#E09F87] h-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* 폴더 선택 */}
            <section className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="folder" className="text-stone-700 flex items-center gap-2">
                  <FolderPlus className="w-4 h-4" />
                  Batch Tags / Category
                </Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {categories.length > 0 ? (
                    categories.map((cat: string) => (
                      <button
                        key={cat}
                        onClick={() => setFolderName(cat)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                          folderName.split(',').map(t => t.trim().replace(/^@+/, '')).filter(Boolean).join(',') === cat.split(',').map(t => t.trim().replace(/^@+/, '')).filter(Boolean).join(',')
                            ? "bg-stone-800 text-white border-stone-800"
                            : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                        )}
                      >
                        {cat}
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-stone-400">No tags yet. Create one below!</span>
                  )}
                </div>
                <Input
                  id="folder"
                  placeholder="Enter shared tags (e.g. '@cafe, @restaurant')"
                  className="bg-stone-50 border-stone-200 focus:border-[#E09F87]"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                />
                <p className="text-[10px] text-stone-400">These tags will be applied to all uploaded photos.</p>
              </div>
            </section>

            {/* 개별 사진 편집 */}
            <section className="bg-white p-4 md:p-5 rounded-3xl shadow-sm border border-stone-100 space-y-4">
              <div className="space-y-2">
                <Label className="text-stone-700">Individual Details</Label>
                <p className="text-[10px] text-stone-400">Edit the title and description for each photo individually.</p>
              </div>
              <div className="space-y-4 pr-1">
                {selectedFiles.map((item, idx) => (
                  <UploadPhotoItem
                    key={idx}
                    item={item}
                    idx={idx}
                    updateFileDetail={updateFileDetail}
                    updateFileLocation={updateFileLocation}
                  />
                ))}
              </div>
            </section>

            <section className="bg-white p-4 md:p-5 rounded-3xl shadow-sm border border-stone-100">
              <div
                className="flex items-center justify-between cursor-pointer group"
                onClick={() => setIsBatchOpen(prev => !prev)}
              >
                <div className="space-y-1">
                  <Label className="text-stone-700 cursor-pointer group-hover:text-[#E09F87] transition-colors">일괄 적용 설정 (공통 정보)</Label>
                  <p className="text-[10px] text-stone-400">아래 정보들은 업로드하는 모든 사진에 동일하게 적용됩니다.</p>
                </div>
                <ChevronDown className={cn("w-5 h-5 text-stone-400 transition-transform duration-300", isBatchOpen && "rotate-180")} />
              </div>

              <div className={cn("grid transition-all duration-300 ease-in-out", isBatchOpen ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0")}>
                <div className="overflow-hidden space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="batchTitle" className="text-stone-700">공통 제목</Label>
                    <Input
                      id="batchTitle"
                      placeholder="모든 사진에 적용할 제목 (예: 제주도 여행)"
                      className="bg-stone-50 border-stone-200 focus:border-[#E09F87]"
                      value={batchTitle}
                      onChange={(e) => setBatchTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="batchDescription" className="text-stone-700">공통 설명</Label>
                    <Textarea
                      id="batchDescription"
                      placeholder="모든 사진에 적용할 설명을 입력하세요"
                      className="bg-stone-50 border-stone-200 focus:border-[#E09F87] min-h-[80px]"
                      value={batchDescription}
                      onChange={(e) => setBatchDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-stone-700">공통 주소 (선택 사항)</Label>
                    <Input
                      id="address"
                      placeholder="GPS 정보가 없는 사진들에 일괄 적용될 주소입니다"
                      className="bg-stone-50 border-stone-200 focus:border-[#E09F87]"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>


          </div>
        )}
      </div>

      <div className="h-12 bg-white border-t border-stone-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] rounded-t-[32px] absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center justify-center">
        <span className="text-xs text-stone-300">Upload History</span>
      </div>
    </div>
  );
}
