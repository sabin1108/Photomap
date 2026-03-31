import { X, Camera, Settings, FolderPlus, Search, MapPin } from 'lucide-react';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { useState, useRef, ChangeEvent } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';

import { usePhotoContext } from '../context/PhotoContext';
import { Photo } from '../type';
import { supabase } from '../lib/supabaseClient';
import exifr from 'exifr';
interface UploadScreenProps {
  onClose: () => void;
}

export function UploadScreen({ onClose }: UploadScreenProps) {
  const { addPhotos, categories } = usePhotoContext();
  const [selectedFiles, setSelectedFiles] = useState<{
    file: File;
    preview: string;
    exif: { lat?: number, lng?: number, takeTime?: string };
    title: string;
    description: string;
    status: 'idle' | 'uploading' | 'done' | 'error';
  }[]>([]);
  const [folderName, setFolderName] = useState<string>('places');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const [batchCoords, setBatchCoords] = useState<{ lat?: number, lng?: number }>({ lat: 37.5665, lng: 126.9780 });
  const [batchDate, setBatchDate] = useState<string>(new Date().toISOString());
  const [batchTitle, setBatchTitle] = useState('');
  const [batchDescription, setBatchDescription] = useState('');
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mapbox Token (Ideally passed from env)
  const MAPBOX_TOKEN = "***SCRUBBED_MAPBOX_TOKEN***";

  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const resp = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&language=ko&limit=5`);
      const data = await resp.json();
      setSuggestions(data.features || []);
    } catch (err) {
      console.error("Geocoding failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newFiles = await Promise.all(files.map(async (file) => {
        const objectUrl = URL.createObjectURL(file);
        let exif = {};
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
          status: 'idle' as const
        };
      }));

      setSelectedFiles(prev => [...prev, ...newFiles]);
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

  const updateFileDetail = (index: number, field: 'title' | 'description', value: string) => {
    setSelectedFiles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
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
        const normalizedTagStr = rawFolder.split(',').map(t => t.trim().replace(/^@+/, '')).filter(Boolean).join(', ');
        const tagsArray = normalizedTagStr.split(',').map(t => t.trim()).filter(Boolean);

        const tempPhoto: Photo = {
          id: crypto.randomUUID(),
          url: publicUrl,
          title: item.title || batchTitle || item.file.name,
          location: "Unknown",
          date: item.exif.takeTime || batchDate || new Date().toISOString(),
          tags: tagsArray,
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
            lat: item.exif.lat || batchCoords.lat,
            lng: item.exif.lng || batchCoords.lng,
            address: address || 'Unknown'
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

    if (failCount === 0) {
      setTimeout(onClose, 1000);
    } else {
      toast.error(`${failCount}개의 파일 업로드에 실패했습니다.`);
    }

    setIsUploading(false);
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#F9F8F6] flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 bg-white/50 backdrop-blur-md sticky top-0 z-10 border-b border-stone-100">
        <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-stone-100 rounded-full">
          <X className="w-6 h-6 text-stone-600" />
        </Button>
        <span className="font-semibold text-lg text-stone-800">New Memory</span>
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
                "aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden group",
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
                  Tag / Category
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
                  placeholder="Enter tag names (e.g. '@cafe, @restaurant')"
                  className="bg-stone-50 border-stone-200 focus:border-[#E09F87]"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                />
                <p className="text-[10px] text-stone-400">This will be used as the main tag.</p>
              </div>
            </section>

            {/* 개별 사진 편집 */}
            <section className="bg-white p-4 md:p-5 rounded-3xl shadow-sm border border-stone-100 space-y-4">
              <div className="space-y-2">
                <Label className="text-stone-700">Individual Details</Label>
                <p className="text-[10px] text-stone-400">Edit the title and description for each photo individually.</p>
              </div>
              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {selectedFiles.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-4 p-4 border border-stone-100 rounded-2xl bg-stone-50 transition-colors focus-within:border-[#E09F87]/50 focus-within:bg-[#E09F87]/5">
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
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white p-4 md:p-5 rounded-3xl shadow-sm border border-stone-100 space-y-4">
              <div className="space-y-2">
                <Label className="text-stone-700">Batch Properties</Label>
                <p className="text-[10px] text-stone-400">The following information will be applied to all uploaded photos.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="batchTitle" className="text-stone-700">Batch Title</Label>
                  <Input
                    id="batchTitle"
                    placeholder="Shared title for all photos"
                    className="bg-stone-50 border-stone-200 focus:border-[#E09F87]"
                    value={batchTitle}
                    onChange={(e) => setBatchTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchDescription" className="text-stone-700">Batch Description</Label>
                  <Textarea
                    id="batchDescription"
                    placeholder="Shared description for all photos"
                    className="bg-stone-50 border-stone-200 focus:border-[#E09F87] min-h-[80px]"
                    value={batchDescription}
                    onChange={(e) => setBatchDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-stone-700">Address (Optional)</Label>
                  <Input
                    id="address"
                    placeholder="Will be applied if photos lack GPS data"
                    className="bg-stone-50 border-stone-200 focus:border-[#E09F87]"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* 메타데이터 (날짜/위치) */}
            <section className="bg-white p-4 md:p-5 rounded-3xl shadow-sm border border-stone-100 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-stone-700">Location & Date</h4>
                {selectedFiles.some(f => !f.exif.lat || !f.exif.takeTime) && (
                  <span className="text-[10px] font-medium text-[#E09F87] bg-orange-50 px-2 py-1 rounded-full border border-orange-100">Some Missing EXIF</span>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-stone-700 text-xs text-stone-500 uppercase tracking-wider">Search Place (장소/주소 검색)</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <Input
                      placeholder="Search for a location..."
                      className="pl-10 bg-stone-50 border-stone-200 focus:border-[#E09F87]"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        fetchSuggestions(e.target.value);
                      }}
                    />
                    {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#E09F87] border-t-transparent rounded-full animate-spin" />}
                  </div>

                  {suggestions.length > 0 && (
                    <div className="mt-2 bg-white border border-stone-100 rounded-xl shadow-lg overflow-hidden z-20">
                      {suggestions.map((s: any) => (
                        <button
                          key={s.id}
                          className="w-full px-4 py-3 text-left hover:bg-stone-50 border-b border-stone-50 last:border-0 flex items-start gap-3 transition-colors"
                          onClick={() => {
                            setBatchCoords({ lat: s.center[1], lng: s.center[0] });
                            setAddress(s.place_name);
                            setSearchQuery(s.text);
                            setSuggestions([]);
                          }}
                        >
                          <MapPin className="w-4 h-4 mt-1 text-[#E09F87]" />
                          <div>
                            <div className="text-sm font-medium text-stone-800">{s.text}</div>
                            <div className="text-[10px] text-stone-400">{s.place_name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-stone-700 text-xs text-stone-500 uppercase tracking-wider">Address (상세 주소)</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter or search address..."
                    className="bg-stone-50 border-stone-200 focus:border-[#E09F87]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-stone-700 text-xs text-stone-500 uppercase tracking-wider">Default Date (기본 날짜)</Label>
                  <Input
                    type="datetime-local"
                    value={batchDate ? new Date(new Date(batchDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      try {
                        const dateObj = new Date(e.target.value);
                        if (!isNaN(dateObj.getTime())) {
                          setBatchDate(dateObj.toISOString());
                        }
                      } catch (err) { }
                    }}
                    className="bg-stone-50 border-stone-200 focus:border-[#E09F87]"
                  />
                </div>

                <p className="text-[10px] text-stone-400 leading-relaxed">
                  * 검색을 통해 장소를 선택하면 <strong>위도, 경도가 자동으로 설정</strong>되어 위치 정보가 없는 사진들에 적용됩니다.
                </p>
              </div>
            </section>

            {/* 빠른 편집 */}
            <section className="bg-white p-4 md:p-5 rounded-3xl shadow-sm border border-stone-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-stone-700 flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Quick Edits
                </h4>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {['Vivid', 'Warm', 'B&W', 'Matte', 'Film'].map(filter => (
                  <button key={filter} className="flex-shrink-0 w-20 h-24 bg-stone-100 rounded-xl flex items-center justify-center text-stone-500 hover:bg-[#E09F87]/10 hover:text-[#E09F87] transition-all border border-transparent hover:border-[#E09F87]/30">
                    <span className="text-sm font-medium">{filter}</span>
                  </button>
                ))}
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
