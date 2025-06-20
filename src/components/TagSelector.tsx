"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Plus, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TAG_CATEGORIES, TAG_COLORS } from '@/types/event';

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  category?: string;
  maxTags?: number;
  suggestedTags?: string[];
  tagConfidences?: Record<string, number>;
}

export function TagSelector({ 
  selectedTags, 
  onTagsChange, 
  category, 
  maxTags = 6, 
  suggestedTags = [],
  tagConfidences = {}
}: TagSelectorProps) {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);

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
      // Filter out any spam-related or inappropriate tags
      const filteredTags = tags.filter(tag => 
        !tag.toLowerCase().includes('spam') && 
        !tag.toLowerCase().includes('detect') &&
        !tag.toLowerCase().includes('ai') &&
        !tag.toLowerCase().includes('quality')
      );
      setAvailableTags(filteredTags);
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

  const getAllAvailableTags = () => {
    return availableTags.filter(tag => !selectedTags.includes(tag));
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

      {/* AI-Generated Suggested Tags */}
      {suggestedTags.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {suggestedTags.filter(tag => !selectedTags.includes(tag)).map((tag) => {
              const confidence = tagConfidences[tag] || 0;
              return (
                <Button
                  key={`ai-suggested-${tag}`}
                  onClick={() => addTag(tag)}
                  variant="ghost"
                  size="sm"
                  disabled={selectedTags.length >= maxTags}
                  className={`h-7 px-2 text-xs shrink-0 font-medium border transition-all ${
                    confidence > 0.8 
                      ? 'text-[#B1810B] bg-[#B1810B]/20 border-[#B1810B]/60 hover:bg-[#B1810B]/30 hover:border-[#B1810B]/80' 
                      : confidence > 0.6 
                      ? 'text-[#B1810B] bg-[#B1810B]/10 border-[#B1810B]/40 hover:bg-[#B1810B]/20 hover:border-[#B1810B]/60' 
                      : 'text-[#B1810B] bg-[#B1810B]/5 border-[#B1810B]/20 hover:bg-[#B1810B]/10 hover:border-[#B1810B]/40'
                  }`}
                >
                  <span className="truncate">{tag}</span>
                  {confidence > 0.7 && (
                    <span className="ml-1 text-xs opacity-75">
                      {Math.round(confidence * 100)}%
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Popular Tags */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white">Popular Tags</p>
          <Button
            onClick={() => setShowAllTags(!showAllTags)}
            variant="ghost"
            size="sm"
            className="text-xs text-gray-400 hover:text-white h-auto p-1"
          >
            {showAllTags ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Show All Tags
              </>
            )}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 sm:gap-2 max-h-32 overflow-y-auto">
          {(showAllTags ? getAllAvailableTags() : getSuggestedTags().filter(tag => !suggestedTags.includes(tag))).map((tag) => (
            <Button
              key={tag}
              onClick={() => addTag(tag)}
              variant="ghost"
              size="sm"
              disabled={selectedTags.length >= maxTags}
              className="h-6 sm:h-7 px-1 sm:px-2 text-xs text-gray-300 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 shrink-0"
            >
              <Plus className="w-3 h-3 mr-1" />
              <span className="truncate">{tag}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Tag Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white">Custom Tags</p>
          <Button
            onClick={() => setShowCustomInput(!showCustomInput)}
            variant="ghost"
            size="sm"
            className="text-xs text-gray-400 hover:text-white h-auto p-1"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Custom
          </Button>
        </div>
        
        {showCustomInput && (
          <div className="flex gap-2">
            <Input
              placeholder="Enter custom tag..."
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCustomTag();
                }
              }}
              className="flex-1 bg-gray-900 border-white/20 text-white placeholder:text-gray-400 text-xs"
              maxLength={20}
            />
            <Button
              onClick={handleCustomTag}
              disabled={!customTag.trim() || selectedTags.length >= maxTags}
              size="sm"
              className="bg-[#B1810B] text-white hover:bg-[#8B6B09] disabled:bg-gray-700 text-xs"
            >
              Add
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 