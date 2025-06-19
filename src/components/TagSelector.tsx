"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TAG_CATEGORIES, TAG_COLORS } from '@/types/event';

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  category?: string;
  maxTags?: number;
}

export function TagSelector({ selectedTags, onTagsChange, category, maxTags = 6 }: TagSelectorProps) {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    loadAvailableTags();
  }, []);

  const loadAvailableTags = async () => {
    try {
      const { data, error } = await supabase
        .from('predefined_tags')
        .select('tag')
        .eq('is_active', true)
        .order('tag');

      if (error) throw error;
      
      const tags = data?.map(item => item.tag) || [];
      setAvailableTags(tags);
    } catch (error) {
      console.error('Error loading tags:', error);
      // Fallback to hardcoded tags if database fails
      const allTags = Object.values(TAG_CATEGORIES).flat();
      setAvailableTags(allTags);
    }
  };

  const getTagColor = (tag: string): string => {
    for (const [cat, tags] of Object.entries(TAG_CATEGORIES)) {
      if ((tags as readonly string[]).includes(tag)) {
        return TAG_COLORS[cat as keyof typeof TAG_COLORS];
      }
    }
    return TAG_COLORS.General;
  };

  const addTag = (tag: string) => {
    if (!selectedTags.includes(tag) && selectedTags.length < maxTags) {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    onTagsChange(selectedTags.filter(t => t !== tag));
  };

  const handleCustomTag = () => {
    const trimmedTag = customTag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag) && selectedTags.length < maxTags) {
      onTagsChange([...selectedTags, trimmedTag]);
      setCustomTag('');
      setShowCustomInput(false);
    }
  };

  const getSuggestedTags = () => {
    // Get category-relevant tags first
    let suggested: string[] = [];
    
    if (category) {
      for (const [cat, tags] of Object.entries(TAG_CATEGORIES)) {
        if ((tags as readonly string[]).includes(category)) {
          suggested = [...suggested, ...tags.filter(tag => 
            availableTags.includes(tag) && !selectedTags.includes(tag)
          )];
          break;
        }
      }
    }
    
    // Add other available tags
    const remaining = availableTags.filter(tag => 
      !suggested.includes(tag) && !selectedTags.includes(tag)
    );
    
    return [...suggested, ...remaining].slice(0, 12);
  };

  return (
    <div className="space-y-3">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-white">Selected Tags ({selectedTags.length}/{maxTags})</p>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs border-0 cursor-pointer hover:opacity-80"
                style={{
                  backgroundColor: `${getTagColor(tag)}20`,
                  color: getTagColor(tag),
                  borderColor: `${getTagColor(tag)}30`
                }}
                onClick={() => removeTag(tag)}
              >
                {tag}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Tags */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-white">Suggested Tags</p>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
          {getSuggestedTags().map((tag) => (
            <Button
              key={tag}
              onClick={() => addTag(tag)}
              variant="ghost"
              size="sm"
              disabled={selectedTags.length >= maxTags}
              className="h-7 px-2 text-xs text-gray-300 hover:bg-gray-800 border border-gray-700 hover:border-gray-600"
            >
              <Plus className="w-3 h-3 mr-1" />
              {tag}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Tag Input */}
      <div className="space-y-2">
        {!showCustomInput ? (
          <Button
            onClick={() => setShowCustomInput(true)}
            variant="ghost"
            size="sm"
            disabled={selectedTags.length >= maxTags}
            className="text-[#B1810B] hover:bg-[#B1810B]/10 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Custom Tag
          </Button>
        ) : (
          <div className="flex gap-2">
            <Input
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="Enter custom tag..."
              className="bg-gray-900 border-gray-700 text-white placeholder-gray-500 text-sm"
              maxLength={20}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCustomTag();
                }
              }}
            />
            <Button
              onClick={handleCustomTag}
              disabled={!customTag.trim()}
              className="bg-[#B1810B] hover:bg-[#D4940D] text-black px-3"
              size="sm"
            >
              Add
            </Button>
            <Button
              onClick={() => {
                setShowCustomInput(false);
                setCustomTag('');
              }}
              variant="ghost"
              className="text-gray-300 hover:bg-gray-800 px-3"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {selectedTags.length >= maxTags && (
        <p className="text-xs text-amber-500">
          Maximum of {maxTags} tags allowed. Remove a tag to add more.
        </p>
      )}
    </div>
  );
} 