// backend/cleanupImages.js
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const Product = require('./models/Product');

class ImageCleanup {
  constructor() {
    this.imagesDir = path.join(__dirname, 'public/images');
    this.supportedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  }

  async connectDB() {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/canteen_management', { // 👈 Changed database name
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnectDB() {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }

  // Get all image URLs from database - FIXED
  async getDatabaseImageUrls() {
    try {
      const products = await Product.find({}, 'imageUrl');
      console.log('📦 Raw products from database:', products); // 👈 Debug line
      
      const imageUrls = products
        .map(product => product.imageUrl)
        .filter(url => url && url.trim() !== ''); // Filter out empty URLs
      
      console.log(`📊 Found ${imageUrls.length} product images in database:`);
      imageUrls.forEach((url, index) => {
        console.log(`  ${index + 1}. ${url}`);
      });
      
      return imageUrls;
    } catch (error) {
      console.error('❌ Error fetching database images:', error);
      throw error;
    }
  }

  // Get all image files from images directory
  async getDiskImageFiles() {
    try {
      const files = await fs.readdir(this.imagesDir);
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return this.supportedFormats.includes(ext);
      });
      
      console.log(`📁 Found ${imageFiles.length} image files on disk:`);
      imageFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
      });
      
      return imageFiles;
    } catch (error) {
      console.error('❌ Error reading images directory:', error);
      throw error;
    }
  }

  // Extract filename from URL and convert to disk filename
  extractFilenameFromUrl(imageUrl) {
    if (!imageUrl) return null;
    
    // Handle different URL formats:
    // - /images/product-123456789.jpg → product-123456789.jpg
    // - http://localhost:5000/images/product-123456789.jpg → product-123456789.jpg
    // - product-123456789.jpg → product-123456789.jpg (already just filename)
    
    const filename = imageUrl.split('/').pop();
    return filename || null;
  }

  // Find orphaned images (files on disk but not in database)
  findOrphanedImages(diskFiles, dbImageUrls) {
    // Convert database URLs to just filenames for comparison
    const dbFilenames = dbImageUrls
      .map(url => this.extractFilenameFromUrl(url))
      .filter(Boolean);

    console.log('\n🔍 Comparing files:');
    console.log('Database references these files:', dbFilenames);
    console.log('Disk has these files:', diskFiles);

    const orphanedFiles = diskFiles.filter(file => !dbFilenames.includes(file));
    
    console.log(`\n🔍 Found ${orphanedFiles.length} orphaned images`);
    return orphanedFiles;
  }

  // Delete orphaned images
  async deleteOrphanedImages(orphanedFiles) {
    const results = {
      deleted: [],
      errors: []
    };

    for (const file of orphanedFiles) {
      try {
        const filePath = path.join(this.imagesDir, file);
        
        // Check if file exists before trying to delete
        try {
          await fs.access(filePath);
        } catch {
          console.log(`⚠️  File not found, skipping: ${file}`);
          continue;
        }

        await fs.unlink(filePath);
        results.deleted.push(file);
        console.log(`🗑️  Deleted: ${file}`);
      } catch (error) {
        results.errors.push({ file, error: error.message });
        console.error(`❌ Error deleting ${file}:`, error.message);
      }
    }

    return results;
  }

  // Validate that database images actually exist on disk
  async validateDatabaseImages(dbImageUrls) {
    const missingFiles = [];
    
    for (const url of dbImageUrls) {
      const filename = this.extractFilenameFromUrl(url);
      if (!filename) continue;

      const filePath = path.join(this.imagesDir, filename);
      
      try {
        await fs.access(filePath);
        console.log(`✅ Database image exists: ${filename}`);
      } catch {
        missingFiles.push({ url, filename });
        console.log(`❌ Database image missing: ${filename}`);
      }
    }

    return missingFiles;
  }

  // Main cleanup function
  async cleanup() {
    console.log('🚀 Starting image cleanup process...\n');
    
    try {
      await this.connectDB();

      // Get images from database and disk
      const [dbImageUrls, diskFiles] = await Promise.all([
        this.getDatabaseImageUrls(),
        this.getDiskImageFiles()
      ]);

      // Find orphaned images
      const orphanedFiles = this.findOrphanedImages(diskFiles, dbImageUrls);

      // Check for database images that don't exist on disk
      const missingFiles = await this.validateDatabaseImages(dbImageUrls);

      if (orphanedFiles.length === 0 && missingFiles.length === 0) {
        console.log('✅ No issues found. Everything is synchronized!');
        return;
      }

      // Display orphaned files
      if (orphanedFiles.length > 0) {
        console.log('\n📋 Orphaned images to delete:');
        orphanedFiles.forEach((file, index) => {
          console.log(`  ${index + 1}. ${file}`);
        });
      }

      // Display missing files
      if (missingFiles.length > 0) {
        console.log('\n⚠️  Database references missing files:');
        missingFiles.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.url} (file: ${item.filename})`);
        });
      }

      // Ask for confirmation (for safety)
      if (orphanedFiles.length > 0) {
        console.log('\n⚠️  WARNING: This will permanently delete the above files.');
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const confirmed = await new Promise((resolve) => {
          readline.question('❓ Do you want to proceed with deletion? (yes/no): ', (answer) => {
            readline.close();
            resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
          });
        });

        if (!confirmed) {
          console.log('❌ Cleanup cancelled by user.');
          return;
        }

        // Delete orphaned images
        console.log('\n🗑️  Deleting orphaned images...');
        const results = await this.deleteOrphanedImages(orphanedFiles);

        // Print summary
        console.log('\n📊 Cleanup Summary:');
        console.log(`✅ Successfully deleted: ${results.deleted.length} files`);
        console.log(`❌ Errors: ${results.errors.length} files`);

        if (results.errors.length > 0) {
          console.log('\n📋 Files with errors:');
          results.errors.forEach(error => {
            console.log(`  - ${error.file}: ${error.error}`);
          });
        }
      }

      if (missingFiles.length > 0) {
        console.log('\n💡 Recommendation: Check why these database entries reference missing files.');
      }

    } catch (error) {
      console.error('💥 Cleanup failed:', error);
    } finally {
      await this.disconnectDB();
      console.log('\n🎉 Cleanup process completed!');
    }
  }

  // Dry run - just identify orphaned images without deleting
  async dryRun() {
    console.log('🔍 Running dry run (no files will be deleted)...\n');
    
    try {
      await this.connectDB();

      const [dbImageUrls, diskFiles] = await Promise.all([
        this.getDatabaseImageUrls(),
        this.getDiskImageFiles()
      ]);

      const orphanedFiles = this.findOrphanedImages(diskFiles, dbImageUrls);
      const missingFiles = await this.validateDatabaseImages(dbImageUrls);

      console.log('\n📊 Analysis Results:');

      if (orphanedFiles.length === 0 && missingFiles.length === 0) {
        console.log('✅ No issues found. Everything is synchronized!');
      } else {
        if (orphanedFiles.length > 0) {
          console.log(`\n📋 Orphaned images that would be deleted (${orphanedFiles.length}):`);
          orphanedFiles.forEach((file, index) => {
            console.log(`  ${index + 1}. ${file}`);
          });
        }

        if (missingFiles.length > 0) {
          console.log(`\n⚠️  Database references missing files (${missingFiles.length}):`);
          missingFiles.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.url} (file: ${item.filename})`);
          });
        }
      }

    } catch (error) {
      console.error('❌ Dry run failed:', error);
    } finally {
      await this.disconnectDB();
    }
  }

  // Quick status check
  async status() {
    console.log('📊 Checking image synchronization status...\n');
    
    try {
      await this.connectDB();

      const [dbImageUrls, diskFiles] = await Promise.all([
        this.getDatabaseImageUrls(),
        this.getDiskImageFiles()
      ]);

      const orphanedFiles = this.findOrphanedImages(diskFiles, dbImageUrls);
      const missingFiles = await this.validateDatabaseImages(dbImageUrls);

      console.log('📈 Status Summary:');
      console.log(`• Database entries: ${dbImageUrls.length}`);
      console.log(`• Disk files: ${diskFiles.length}`);
      console.log(`• Orphaned files: ${orphanedFiles.length}`);
      console.log(`• Missing files: ${missingFiles.length}`);

      if (orphanedFiles.length === 0 && missingFiles.length === 0) {
        console.log('🎉 Perfect synchronization!');
      }

    } catch (error) {
      console.error('❌ Status check failed:', error);
    } finally {
      await this.disconnectDB();
    }
  }
}

// Command line interface
async function main() {
  const cleanup = new ImageCleanup();
  const args = process.argv.slice(2);
  
  if (args.includes('--dry-run') || args.includes('-d')) {
    await cleanup.dryRun();
  } else if (args.includes('--status') || args.includes('-s')) {
    await cleanup.status();
  } else if (args.includes('--help') || args.includes('-h')) {
    showHelp();
  } else {
    await cleanup.cleanup();
  }
}

function showHelp() {
  console.log(`
🖼️  Image Cleanup Script

Usage:
  node cleanupImages.js          Run cleanup (with confirmation)
  node cleanupImages.js --dry-run  Dry run (no deletion)
  node cleanupImages.js --status   Quick status check
  node cleanupImages.js --help    Show this help

Options:
  --dry-run, -d    Identify orphaned images without deleting
  --status, -s     Quick synchronization status check
  --help, -h       Show help message

Description:
  This script finds and deletes image files in public/images folder
  that are not referenced in the database.
  `);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ImageCleanup;