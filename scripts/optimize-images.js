#!/usr/bin/env node

/**
 * Image Optimization Script for Forge EC Website
 * Uses Sharp for high-performance image processing
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  inputDir: path.join(__dirname, '..', 'assets', 'images'),
  outputDir: path.join(__dirname, '..', 'assets', 'optimized'),
  formats: ['webp', 'avif', 'jpeg'],
  sizes: [320, 640, 768, 1024, 1280, 1920],
  quality: {
    jpeg: 85,
    webp: 85,
    avif: 80
  }
};

class ImageOptimizer {
  constructor(config) {
    this.config = config;
    this.processedCount = 0;
    this.totalSize = { before: 0, after: 0 };
  }

  async init() {
    console.log('🖼️  Starting image optimization...');
    
    try {
      // Ensure output directory exists
      await this.ensureDirectory(this.config.outputDir);
      
      // Process all images
      await this.processDirectory(this.config.inputDir);
      
      // Generate responsive image manifest
      await this.generateManifest();
      
      this.printSummary();
    } catch (error) {
      console.error('❌ Image optimization failed:', error);
      process.exit(1);
    }
  }

  async ensureDirectory(dir) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async processDirectory(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await this.processDirectory(fullPath);
        } else if (this.isImageFile(entry.name)) {
          await this.processImage(fullPath);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not process directory ${dir}:`, error.message);
    }
  }

  isImageFile(filename) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'];
    return imageExtensions.includes(path.extname(filename).toLowerCase());
  }

  async processImage(inputPath) {
    try {
      const filename = path.basename(inputPath, path.extname(inputPath));
      const relativePath = path.relative(this.config.inputDir, path.dirname(inputPath));
      const outputDir = path.join(this.config.outputDir, relativePath);
      
      await this.ensureDirectory(outputDir);
      
      // Get original file stats
      const originalStats = await fs.stat(inputPath);
      this.totalSize.before += originalStats.size;
      
      console.log(`📸 Processing: ${path.relative(process.cwd(), inputPath)}`);
      
      // Load image with Sharp
      const image = sharp(inputPath);
      const metadata = await image.metadata();
      
      // Generate responsive variants
      for (const size of this.config.sizes) {
        // Skip if original is smaller than target size
        if (metadata.width && metadata.width < size) continue;
        
        for (const format of this.config.formats) {
          const outputPath = path.join(outputDir, `${filename}-${size}w.${format}`);
          
          await this.generateVariant(image, outputPath, size, format);
          
          // Track output size
          const outputStats = await fs.stat(outputPath);
          this.totalSize.after += outputStats.size;
        }
      }
      
      // Generate original format optimized version
      const originalFormat = metadata.format || 'jpeg';
      const optimizedOriginalPath = path.join(outputDir, `${filename}.${originalFormat}`);
      
      await this.generateVariant(image, optimizedOriginalPath, null, originalFormat);
      
      const optimizedStats = await fs.stat(optimizedOriginalPath);
      this.totalSize.after += optimizedStats.size;
      
      this.processedCount++;
      
    } catch (error) {
      console.error(`❌ Failed to process ${inputPath}:`, error.message);
    }
  }

  async generateVariant(image, outputPath, width, format) {
    try {
      let pipeline = image.clone();
      
      // Resize if width is specified
      if (width) {
        pipeline = pipeline.resize(width, null, {
          withoutEnlargement: true,
          fastShrinkOnLoad: true
        });
      }
      
      // Apply format-specific optimizations
      switch (format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({
            quality: this.config.quality.jpeg,
            progressive: true,
            mozjpeg: true
          });
          break;
          
        case 'webp':
          pipeline = pipeline.webp({
            quality: this.config.quality.webp,
            effort: 6
          });
          break;
          
        case 'avif':
          pipeline = pipeline.avif({
            quality: this.config.quality.avif,
            effort: 9
          });
          break;
          
        case 'png':
          pipeline = pipeline.png({
            progressive: true,
            compressionLevel: 9
          });
          break;
      }
      
      await pipeline.toFile(outputPath);
      
    } catch (error) {
      console.error(`❌ Failed to generate variant ${outputPath}:`, error.message);
    }
  }

  async generateManifest() {
    const manifestPath = path.join(this.config.outputDir, 'image-manifest.json');
    
    const manifest = {
      generated: new Date().toISOString(),
      config: this.config,
      stats: {
        processedImages: this.processedCount,
        totalSizeBefore: this.totalSize.before,
        totalSizeAfter: this.totalSize.after,
        compressionRatio: this.totalSize.before > 0 ? 
          ((this.totalSize.before - this.totalSize.after) / this.totalSize.before * 100).toFixed(2) + '%' : '0%'
      }
    };
    
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`📋 Generated manifest: ${manifestPath}`);
  }

  printSummary() {
    const sizeBefore = this.formatBytes(this.totalSize.before);
    const sizeAfter = this.formatBytes(this.totalSize.after);
    const savings = this.totalSize.before > 0 ? 
      ((this.totalSize.before - this.totalSize.after) / this.totalSize.before * 100).toFixed(2) : 0;
    
    console.log('\n✅ Image optimization completed!');
    console.log(`📊 Processed: ${this.processedCount} images`);
    console.log(`📉 Size before: ${sizeBefore}`);
    console.log(`📈 Size after: ${sizeAfter}`);
    console.log(`💾 Space saved: ${savings}%`);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Run optimization if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const optimizer = new ImageOptimizer(CONFIG);
  optimizer.init();
}

export default ImageOptimizer;
