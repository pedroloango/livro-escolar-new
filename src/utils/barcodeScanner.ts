
// Função para verificar permissões da câmera
export const checkPermissions = async (): Promise<boolean> => {
  try {
    const permissions = await navigator.permissions.query({ name: 'camera' as any });
    if (permissions.state === 'denied') {
      alert('Permissão da câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Erro ao verificar permissões:', error);
    return true; // Prosseguir em navegadores que não suportam a API de permissões
  }
};

// Função principal para iniciar o scanner de código de barras
export const startBarcodeScanner = async (
  onScan: (barcode: string) => void,
  onError: (message: string) => void,
  videoElement: HTMLVideoElement | null
): Promise<() => void> => {
  if (!videoElement) {
    onError('Elemento de vídeo não encontrado');
    return () => {};
  }

  // Importar a biblioteca de leitura de código de barras dinamicamente
  let barcodeDetector: any;
  
  try {
    if ('BarcodeDetector' in window) {
      // Usar BarcodeDetector API se disponível (Chrome, Edge)
      barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'code_39', 'code_128', 'qr_code', 'pdf417', 'upc_a', 'upc_e']
      });
    } else {
      // Caso contrário, informar que precisamos usar uma biblioteca externa
      console.warn('BarcodeDetector API não disponível. Usando biblioteca alternativa...');
      
      // Aqui você usaria uma biblioteca como ZXing ou QuaggaJS
      // Como exemplo, vamos simular leitura para fins de demonstração
      barcodeDetector = {
        detect: async (image: any) => {
          return [];
        }
      };
    }
  } catch (error) {
    console.error('Erro ao inicializar detector de código de barras:', error);
    onError('Não foi possível inicializar o leitor de código de barras');
    return () => {};
  }

  let stream: MediaStream | null = null;
  
  try {
    // Obter stream da câmera
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    
    videoElement.srcObject = stream;
    await videoElement.play();
    
    let scanning = true;
    let lastDetectedCode = '';
    let lastDetectionTime = 0;
    
    // Função para detectar códigos de barras em intervalos
    const detectCodes = async () => {
      if (!scanning || !videoElement || !stream) return;
      
      try {
        const results = await barcodeDetector.detect(videoElement);
        
        const currentTime = Date.now();
        // Se algum código for detectado e for diferente do último ou mais de 3 segundos se passaram
        if (results.length > 0 && (results[0].rawValue !== lastDetectedCode || currentTime - lastDetectionTime > 3000)) {
          lastDetectedCode = results[0].rawValue;
          lastDetectionTime = currentTime;
          
          // Enviar o código detectado para a função de callback
          onScan(lastDetectedCode);
          return; // Interromper a detecção após encontrar um código válido
        }
      } catch (error) {
        console.error('Erro na detecção:', error);
      }
      
      // Continuar a detecção se ainda estiver escaneando
      if (scanning) {
        requestAnimationFrame(detectCodes);
      }
    };
    
    // Iniciar a detecção
    detectCodes();
    
    // Retornar função de limpeza
    return () => {
      scanning = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  } catch (error) {
    console.error('Erro ao acessar câmera:', error);
    onError('Não foi possível acessar a câmera');
    return () => {};
  }
};
