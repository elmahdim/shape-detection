/**
 * Selectors
 */
const btnStart = document.getElementById('start');
const controls = document.querySelectorAll('.control');
const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');

/**
 * Declare global variables
 */
let currentDemo = null;

/**
 * Check whether browser supports Shape Detection API
 */
const { FaceDetector, TextDecoder, BarcodeDetector } = window;
const isShapeDetectionAPISupported = () => FaceDetector && TextDecoder && BarcodeDetector;

/**
 * Print reason that occured the error 
 */
const printError = reason => console.error(`Error occured: ${reason}`);

/**
 * Provide contextual feedback messages for actions
 */
const flashMessage = (input, type) => {
  const flash = document.querySelector('.flash');
  flash.classList.toggle('is-active', input);
  flash.classList.remove('ok', 'info')
  flash.className += ` ${type}`;
  flash.innerHTML = input && input;
};

/**
 * Show or reset/hide the captured image
 */
const handlePreview = src => {
  const demoContainer = document.querySelector('.demo-container');
  const previewImg = document.querySelector('.preview-img');

  demoContainer.classList.toggle('preview-is-active');
  previewImg.src = src ? canvas.toDataURL('image/jpeg', 1.0) : '';
};

/**
 * Scan QR Code and display the results
 */
const scanResult = input => {
  input && flashMessage(input, 'ok');
};

/**
 * Draw eyes, and mouth once coordinates if found (live)
 */
const handleDetectedFaces = faces => {
  if (!faces) return;
  faces.forEach(detectedFace => {
    if (detectedFace.landmarks) {
      const { boundingBox, landmarks } = detectedFace;
      const { top, left, width, height } = boundingBox;

      flashMessage('Face(s) Detected', 'ok');
      landmarks.forEach(({ locations: { x, y }, type }) => {
        context.beginPath();
        context.arc(x, y, 3, 0, Math.PI * 2);

        context.strokeStyle = type === 'eye' ? '#76d360' : '#ffeb3b';
        context.stroke();

        context.fillStyle = type === 'eye' ? '#76d360' : '#ffeb3b';
        context.fillText(type, x + 10, y + 4);
      });
    }
  });
};

/**
 * Draw rectangle over detected text blocks
 */
const handleDetectedTexts = texts => {
  if (!texts) return;
  context.strokeStyle = '#f44336';
  context.fillStyle = '#f44336';

  texts.forEach(detectedText => {
    const { top, left, width, height } = detectedText.boundingBox;
    context.beginPath();
    context.rect(left, top, width, height);
    context.stroke();
    context.fillText(detectedText.rawValue, left + 5, top - 12);
  });
};

/**
 * Draw rectangle over detected barcode and read its data
 */
const handleDetectedBarcodes = barcodes => {
  if (!barcodes) return;
  context.strokeStyle = '#d32f2f';
  barcodes.forEach(({boundingBox, rawValue}) => {
    const { top, left, width, height } = boundingBox;
    
    context.beginPath();
    context.rect(left, top, width + 30, height + 15);
    context.stroke();

    scanResult(rawValue);
  });
};

/**
 * Demo initialization
 */
const initialize = async () => {
  document.body.classList.add('run-demo');
  let isRendered = false;
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    video: true
  });
  const faceDetector = new FaceDetector();
  const textDetector = new TextDetector();
  const barcodeDetector = new BarcodeDetector();
  const video = document.createElement('video');

  video.srcObject = mediaStream;
  video.autoplay = true;

  const run = () => {
    if (!video.paused) {
      isRendered = true;

      Promise.all([
        faceDetector.detect(video).catch(reason => printError(reason)),
        textDetector.detect(video).catch(reason => printError(reason)),
        barcodeDetector.detect(video).catch(reason => printError(reason))
      ]).then(([faces, texts, barcodes]) => {
        const { width, height } = canvas;
        const { videoWidth, videoHeight } = video;

        context.clearRect(0, 0, width, height);
        context.drawImage(video, 0, 0, width, videoHeight);
        
        context.font = '16px Helvetica, Arial, sans-serif';
        context.lineWidth = 3;
        context.shadowColor = 'black';
        context.shadowBlur = 20;
        
        currentDemo === 'Face' && handleDetectedFaces(faces);
        currentDemo === 'Text' && handleDetectedTexts(texts);
        currentDemo === 'Barcode' && handleDetectedBarcodes(barcodes);
        isRendered = false;
      });
    }
  };

  (drawOften = () => {
    requestAnimationFrame(drawOften);
    isRendered ? cancelAnimationFrame(drawOften) : run();
  })(); // IIFE
};

btnStart.addEventListener('click', () => {
  isShapeDetectionAPISupported ? initialize() : alert('Shape Detection not supported on this platform');
});

controls.forEach(control => {
  control.addEventListener('click', () => {
    const { dataset: { demo } } = control;

    currentDemo = demo;
    demo === 'Capture' && handlePreview(1);
    demo === 'Reset' && handlePreview();
    flashMessage(demo, 'info');
  });
});
