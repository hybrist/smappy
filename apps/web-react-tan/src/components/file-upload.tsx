import { useState, useCallback } from 'react';
import { Upload, FileCode, FileJson, FileType, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploadProps {
  onUpload: (files: File[]) => void;
}

export function FileUpload({ onUpload }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const newFiles = Array.from(e.dataTransfer.files);
        setFiles((prev) => [...prev, ...newFiles]);
        onUpload(newFiles);
      }
    },
    [onUpload],
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'relative group cursor-pointer rounded-xl border-2 border-dashed p-12 transition-all duration-300 ease-in-out bg-card',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.02] shadow-xl'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20',
        )}
      >
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div
            className={cn(
              'p-4 rounded-full transition-colors duration-300',
              isDragging
                ? 'bg-primary/20 text-primary'
                : 'bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10',
            )}
          >
            <Upload className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground">
              Drop your bundle assets here
            </p>
            <p className="text-sm text-muted-foreground">
              Supports .js, .map, .json (stats)
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 grid gap-2"
          >
            {files.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between p-3 rounded-lg border bg-card shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-primary/10 text-primary">
                    {file.name.endsWith('.json') ? (
                      <FileJson className="w-4 h-4" />
                    ) : file.name.endsWith('.js') ? (
                      <FileCode className="w-4 h-4" />
                    ) : (
                      <FileType className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
