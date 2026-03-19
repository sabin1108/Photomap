import { X, Camera, Settings, FolderPlus } from 'lucide-react';
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
  const { addPhoto, categories } = usePhotoContext();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  // Use a string for folder name to allow custom input, though we can suggest defaults
  const [folderName, setFolderName] = useState<string>('places');
  const [isUploading, setIsUploading] = useState(false);
  const [exifData, setExifData] = useState<{ lat?: number, lng?: number, takeTime?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      try {
        const parsed = await exifr.parse(file);
        setExifData({
          lat: parsed?.latitude,
          lng: parsed?.longitude,
          takeTime: parsed?.DateTimeOriginal ? new Date(parsed.DateTimeOriginal).toISOString() : undefined
        });
      } catch (err) {
        console.warn("EXIF 정보를 읽을 수 없습니다.", err);
        setExifData({});
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handlePost = async () => {
    if (!selectedFile) {
      toast.error("사진을 선택해주세요");
      return;
    }

    if (!folderName.trim()) {
      toast.error("폴더 이름을 입력해주세요 (예: travel, food)");
      return;
    }

    setIsUploading(true);

    try {
      // 스토리지 저장 경로는 안전하게 ASCII 문자만 사용 (한글/특수문자 이슈 방지)
      // 실제 카테고리(폴더) 분류는 DB에서 관리하므로 스토리지 경로는 단순화해도 됨
      const safeDir = 'uploads';
      const fileName = `${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`; // 파일명 특수문자 제거
      const filePath = `${safeDir}/${fileName}`;

      //(재시도 로직)
      const uploadWithRetry = async (attempts = 3): Promise<any> => {
        try {
          const { error, data } = await supabase.storage
            .from('photos')
            .upload(filePath, selectedFile);
          if (error) throw error;
          return data;
        } catch (e) {
          if (attempts <= 1) throw e;
          console.warn(`업로드 실패, 재시도 중... (${attempts - 1}회 남음)`);
          await new Promise(r => setTimeout(r, 1000));
          return uploadWithRetry(attempts - 1);
        }
      };

      await uploadWithRetry();

      //(재시도 로직과 함께 에러 정의가 제거됨)



      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      // 부분적인 Photo 객체 생성
      const tempPhoto: Photo = {
        id: crypto.randomUUID(), // 임시 ID
        url: publicUrl,
        title: description,
        location: "Unknown",
        date: exifData.takeTime || new Date().toISOString(),
        tags: [],
        category: folderName.trim(), // UI/DB에는 사용자가 입력한 원래 이름(한글 등) 사용
        isFavorite: false
      };

      // Context를 호출하여 DB에 저장 (정규화)
      await addPhoto(tempPhoto, selectedFile, {
        folder: folderName.trim(), // DB 저장은 원래 이름으로
        description: description,
        tags: tags,
        lat: exifData.lat || 37.5665, // EXIF 좌표가 있으면 사용, 없으면 서울
        lng: exifData.lng || 126.9780
      });

      setTimeout(onClose, 1000);

    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#F9F8F6] flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/50 backdrop-blur-md sticky top-0 z-10 border-b border-stone-100">
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

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-40">



        {/* 선택 영역 */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-light text-stone-800">Select Photo</h3>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 업로드 트리거 / 미리보기 */}
            <div
              onClick={triggerFileInput}
              className={cn(
                "aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden group",
                previewUrl ? "border-[#E09F87]" : "border-stone-200 hover:border-[#E09F87] hover:text-[#E09F87] text-stone-400 bg-white"
              )}
            >
              {previewUrl ? (
                <>
                  <ImageWithFallback src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-medium bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">Change Photo</span>
                  </div>
                </>
              ) : (
                <>
                  <Camera className="w-12 h-12 mb-3 opacity-50" />
                  <span className="text-sm font-medium">Tap to Select Photo</span>
                </>
              )}
            </div>
          </div>
        </section>

        {/* 편집 및 분류 (선택 시 표시) */}
        {selectedFile && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 폴더 선택 */}
            <section className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="folder" className="text-stone-700 flex items-center gap-2">
                  <FolderPlus className="w-4 h-4" />
                  Folder / Category
                </Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {categories.length > 0 ? (
                    categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setFolderName(cat)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                          folderName === cat
                            ? "bg-stone-800 text-white border-stone-800"
                            : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                        )}
                      >
                        {cat}
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-stone-400">No folders yet. Create one below!</span>
                  )}
                </div>
                <Input
                  id="folder"
                  placeholder="Enter specific folder name (e.g. 'Jeju_Trip')"
                  className="bg-stone-50 border-stone-200 focus:border-[#E09F87]"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                />
                <p className="text-[10px] text-stone-400">This will be used as the storage folder and main tag.</p>
              </div>
            </section>

            {/* 상세 정보 입력 */}
            <section className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description" className="text-stone-700">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Write a caption..."
                  className="bg-stone-50 border-stone-200 focus:border-[#E09F87] min-h-[100px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags" className="text-stone-700">Tags</Label>
                <Input
                  id="tags"
                  placeholder="#travel #food #nature"
                  className="bg-stone-50 border-stone-200 focus:border-[#E09F87]"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
            </section>

            {/* 빠른 편집 */}
            <section className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100">
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

      {/* 기록 타임라인 - 하단 고정 시트 (옵션, 기존 기능을 유지하지만 하드코딩된 로직은 제거됨을 명시) */}
      {/* 사용자 요청에 따라 하드코딩된 'Upload History' 섹션 로직 제거됨. */}
      <div className="h-12 bg-white border-t border-stone-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] rounded-t-[32px] absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center justify-center">
        <span className="text-xs text-stone-300">Upload History</span>
      </div>
    </div>
  );
}
