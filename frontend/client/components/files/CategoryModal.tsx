import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { getCategories } from '../../services/api';

interface Category {
  id: number;
  name: string;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (categoryId: number) => void;
  files: File[];
}

export function CategoryModal({ isOpen, onClose, onUpload, files }: CategoryModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await getCategories();
      setCategories(response.categories || []);
      
      // Auto-select first category if available
      if (response.categories && response.categories.length > 0) {
        setSelectedCategory(response.categories[0].id);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = () => {
    if (selectedCategory !== null) {
      onUpload(selectedCategory);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedCategory(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Category</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">
              Files to upload ({files.length}):
            </Label>
            <div className="mt-2 space-y-1">
              {files.map((file, index) => (
                <div key={index} className="text-sm text-muted-foreground">
                  • {file.name}
                </div>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading categories...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Choose a category:</Label>
              <RadioGroup
                value={selectedCategory?.toString() || ''}
                onValueChange={(value) => setSelectedCategory(parseInt(value))}
              >
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={category.id.toString()} id={`category-${category.id}`} />
                    <Label htmlFor={`category-${category.id}`} className="text-sm">
                      {category.name}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={selectedCategory === null || loading}
            >
              Upload Files
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 