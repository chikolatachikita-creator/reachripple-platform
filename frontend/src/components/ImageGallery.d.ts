import React from 'react';

interface ImageGalleryProps {
  images?: string[];
  title?: string;
  isAdult?: boolean;
}

declare const ImageGallery: React.FC<ImageGalleryProps>;
export default ImageGallery;
