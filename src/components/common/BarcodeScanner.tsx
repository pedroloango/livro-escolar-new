
import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { startBarcodeScanner, checkPermissions } from '@/utils/barcodeScanner';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, isOpen, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  
  useEffect(() => {
    let cleanup: () => void = () => {};
    
    const startScanner = async () => {
      if (!isOpen) return;
      
      setScanning(true);
      
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        onClose();
        setScanning(false);
        return;
      }
      
      cleanup = await startBarcodeScanner(
        (barcode) => {
          onScan(barcode);
          setScanning(false);
          onClose();
          toast.success('Código escaneado com sucesso');
        },
        (error) => {
          toast.error(error);
          setScanning(false);
          onClose();
        },
        videoRef.current
      );
    };
    
    startScanner();
    
    return () => {
      cleanup();
      setScanning(false);
    };
  }, [isOpen, onScan, onClose]);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escanear código de barras</DialogTitle>
          <DialogDescription>
            Posicione o código de barras no centro da câmera
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative w-full overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            className="w-full h-[300px] object-cover"
            playsInline
            muted
          />
          
          <div className="absolute top-2 right-2">
            <Button 
              size="icon" 
              variant="secondary" 
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2/3 h-1 bg-red-500 animate-pulse"></div>
            </div>
          )}
        </div>
        
        <div className="text-center text-sm text-muted-foreground">
          {scanning ? 'Escaneando...' : 'Aguardando iniciar câmera...'}
        </div>
      </DialogContent>
    </Dialog>
  );
}
