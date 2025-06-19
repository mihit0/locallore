"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { TAG_CATEGORIES, TAG_COLORS } from '@/types/event';

interface UserPreferencesProps {
  userId: string;
  initialPreferences?: string[];
  onPreferencesUpdate?: (preferences: string[]) => void;
}

export function UserPreferences({ userId, initialPreferences = [], onPreferencesUpdate }: UserPreferencesProps) {
  const [preferences, setPreferences] = useState<string[]>(initialPreferences);
  const [isEditing, setIsEditing] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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

  const updatePreferences = async (newPreferences: string[]) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('update_user_preferences', {
        user_uuid: userId,
        new_preferences: newPreferences
      });

      if (error) throw error;

      setPreferences(newPreferences);
      onPreferencesUpdate?.(newPreferences);
      toast.success('Preferences updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const addPreference = (tag: string) => {
    if (!preferences.includes(tag)) {
      const newPreferences = [...preferences, tag];
      setPreferences(newPreferences);
    }
  };

  const removePreference = (tag: string) => {
    const newPreferences = preferences.filter(p => p !== tag);
    setPreferences(newPreferences);
  };

  const getTagColor = (tag: string): string => {
    for (const [category, tags] of Object.entries(TAG_CATEGORIES)) {
      if ((tags as readonly string[]).includes(tag)) {
        return TAG_COLORS[category as keyof typeof TAG_COLORS];
      }
    }
    return TAG_COLORS.General;
  };

  const getAvailableTagsToAdd = () => {
    return availableTags.filter(tag => !preferences.includes(tag));
  };

  if (!isEditing) {
    return (
      <Card className="bg-black/40 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Interests & Preferences
            </CardTitle>
            <Button
              onClick={() => setIsEditing(true)}
              variant="ghost"
              size="sm"
              className="text-[#B1810B] hover:bg-[#B1810B]/10"
            >
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {preferences.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No preferences set yet</p>
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="border-[#B1810B] text-[#B1810B] hover:bg-[#B1810B]/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Preferences
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {preferences.map((pref) => (
                <Badge
                  key={pref}
                  variant="outline"
                  className="text-xs border-0"
                  style={{
                    backgroundColor: `${getTagColor(pref)}20`,
                    color: getTagColor(pref),
                    borderColor: `${getTagColor(pref)}30`
                  }}
                >
                  {pref}
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-3">
            These preferences help us recommend relevant events for you.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/40 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Edit Interests & Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Preferences */}
        <div>
          <h4 className="text-sm font-medium text-white mb-2">Selected Preferences</h4>
          {preferences.length === 0 ? (
            <p className="text-gray-400 text-sm">No preferences selected</p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-3">
              {preferences.map((pref) => (
                <Badge
                  key={pref}
                  variant="outline"
                  className="text-xs border-0 cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: `${getTagColor(pref)}20`,
                    color: getTagColor(pref),
                    borderColor: `${getTagColor(pref)}30`
                  }}
                  onClick={() => removePreference(pref)}
                >
                  {pref}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Available Tags */}
        <div>
          <h4 className="text-sm font-medium text-white mb-2">Available Tags</h4>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {Object.entries(TAG_CATEGORIES).map(([category, tags]) => (
              <div key={category} className="space-y-1">
                <p className="text-xs text-gray-400 font-medium">{category}</p>
                <div className="flex flex-wrap gap-1">
                  {tags.filter(tag => availableTags.includes(tag) && !preferences.includes(tag)).map((tag) => (
                    <Button
                      key={tag}
                      onClick={() => addPreference(tag)}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-gray-300 hover:bg-gray-800 border border-gray-700 hover:border-gray-600"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={() => updatePreferences(preferences)}
            disabled={loading}
            className="bg-[#B1810B] hover:bg-[#D4940D] text-black"
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </Button>
          <Button
            onClick={() => {
              setPreferences(initialPreferences);
              setIsEditing(false);
            }}
            variant="ghost"
            className="text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 