import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface ImageData {
  id: string;
  file: File;
  preview: string;
  status: "idle" | "processing" | "done";
  resultUrl?: string;
}

export default function App() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false); // 処理中フラグ

  // 1枚の画像をリサイズ・変換する関数 
  const processImage = async (imgData: ImageData): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = imgData.preview;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // EC向け：最大1200pxに収める（アスペクト比維持）
        const MAX_SIZE = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        // WebP形式、画質0.8で出力（ファイルサイズが劇的に減ります）
        resolve(canvas.toDataURL("image/webp", 0.8));
      };
    });
  };

  // 一括実行ボタンのハンドラー 
  const handleStartOptimization = async () => {
    setIsProcessing(true);

    const updatedImages = await Promise.all(
      images.map(async (img) => {
        const resultUrl = await processImage(img);
        // previewを変換後のresultUrlに書き換えることで、画面上もWebPになります
        return {
          ...img,
          resultUrl,
          preview: resultUrl,
          status: "done" as const,
        };
      }),
    );

    setImages(updatedImages);
    setIsProcessing(false);
    alert("すべての画像の最適化が完了しました！");
  };

  // ファイルが選択された時の処理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files).map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      status: "idle" as const,
    }));

    setImages((prev) => [...prev, ...newFiles]);
  };

  const downloadAllAsZip = async () => {
    const zip = new JSZip();

    images.forEach((img) => {
      if (img.resultUrl) {
        // DataURLからBase64部分を抽出してZipに追加
        const base64Data = img.resultUrl.split(",")[1];
        const fileName = img.file.name.replace(/\.[^/.]+$/, "") + ".webp";
        zip.file(fileName, base64Data, { base64: true });
      }
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "optimized_images.zip");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-slate-800">
            画像最適化くん
          </h1>
          <p className="text-slate-500 mt-2">
            画像を一括でWebP変換します
          </p>
        </header>

        {/* アップロードエリア */}
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center hover:border-blue-400 transition-colors mb-8">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold inline-block hover:bg-blue-700 shadow-lg">
              画像を選択（複数可）
            </div>
            <p className="text-sm text-slate-400 mt-3">
              またはここにドラッグ＆ドロップ
            </p>
          </label>
        </div>

        {/* プレビューリスト */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="bg-white p-2 rounded-lg shadow-sm border border-slate-200"
            >
              <img
                src={img.preview}
                className="w-full h-32 object-cover rounded mb-2"
              />
              <div className="text-[10px] text-slate-500 truncate">
                {img.file.name}
              </div>
              <div className="text-[10px] font-bold text-blue-500">
                {(img.file.size / 1024).toFixed(1)} KB
              </div>
            </div>
          ))}
        </div>

        {/* 実行ボタン */}
        {images.length > 0 && (
          <div className="mt-8 text-center pb-20">
            <button
              onClick={handleStartOptimization}
              disabled={isProcessing}
              className={`${
                isProcessing
                  ? "bg-slate-400"
                  : "bg-emerald-500 hover:bg-emerald-600"
              } text-white px-10 py-4 rounded-full font-black text-xl shadow-xl transition-all active:scale-95`}
            >
              {isProcessing ? "処理中..." : "一括最適化を開始"}
            </button>

            {/* 完了後にダウンロードを促すメッセージ */}
            {images.some((img) => img.status === "done") && !isProcessing && (
              <div className="mt-6 p-6 bg-emerald-50 rounded-xl border border-emerald-200 animate-fade-in">
                <p className="text-emerald-700 font-bold mb-4">
                  ✨ すべての最適化が完了しました！
                </p>
                <button
                  onClick={downloadAllAsZip}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-md transition-all flex items-center justify-center mx-auto gap-2"
                >
                  <span>WebP画像をまとめてZipで保存</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
