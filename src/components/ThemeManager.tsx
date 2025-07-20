"use client";

import React, { useState } from "react";
import { Theme, THEME_COLORS } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface ThemeManagerProps {
  themes: Theme[];
  currentThemeId: string | null;
  onCreateTheme: (theme: Theme) => void;
  onUpdateTheme: (theme: Theme) => void;
  onDeleteTheme: (themeId: string) => void;
  onSelectTheme: (themeId: string | null) => void;
  onClose: () => void;
}

export const ThemeManager: React.FC<ThemeManagerProps> = ({
  themes,
  currentThemeId,
  onCreateTheme,
  onUpdateTheme,
  onDeleteTheme,
  onSelectTheme,
  onClose,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: THEME_COLORS[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) return;

    if (editingTheme) {
      // 編輯現有主題
      const updatedTheme: Theme = {
        ...editingTheme,
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
        updatedAt: new Date().toISOString(),
      };
      onUpdateTheme(updatedTheme);
      setEditingTheme(null);
    } else {
      // 建立新主題
      const newTheme: Theme = {
        id: uuidv4(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onCreateTheme(newTheme);
      setIsCreating(false);
    }

    setFormData({ name: "", description: "", color: THEME_COLORS[0] });
  };

  const handleEdit = (theme: Theme) => {
    setEditingTheme(theme);
    setFormData({
      name: theme.name,
      description: theme.description || "",
      color: theme.color,
    });
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingTheme(null);
    setFormData({ name: "", description: "", color: THEME_COLORS[0] });
  };

  const handleDelete = (theme: Theme) => {
    if (
      confirm(
        `確定要刪除主題「${theme.name}」嗎？此操作會同時刪除該主題下的所有便條紙和連線。`
      )
    ) {
      onDeleteTheme(theme.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* 標題列 */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">主題管理</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 內容區域 */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* 全部便條紙選項 */}
          <div
            className={`p-4 rounded-lg border-2 cursor-pointer mb-4 transition-colors ${
              currentThemeId === null
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => onSelectTheme(null)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-full bg-gray-500 border-2 border-gray-600 shadow-sm"></div>
                <div>
                  <h3 className="font-medium text-gray-800">全部便條紙</h3>
                  <p className="text-sm text-gray-500">檢視所有主題的便條紙</p>
                </div>
              </div>
              {currentThemeId === null && (
                <div className="text-blue-500 text-sm">✓ 目前選中</div>
              )}
            </div>
          </div>

          {/* 主題列表 */}
          <div className="space-y-3 mb-6">
            {themes.map((theme) => (
              <div
                key={theme.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  currentThemeId === theme.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => onSelectTheme(theme.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-gray-500 shadow-sm"
                      style={{ backgroundColor: theme.color }}
                    ></div>
                    <div>
                      <h3 className="font-medium text-gray-800">
                        {theme.name}
                      </h3>
                      {theme.description && (
                        <p className="text-sm text-gray-500">
                          {theme.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {currentThemeId === theme.id && (
                      <div className="text-blue-500 text-sm">✓ 目前選中</div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(theme);
                      }}
                      className="text-gray-700 hover:text-blue-800 p-1"
                      title="編輯主題"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(theme);
                      }}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="刪除主題"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 新增主題表單 */}
          {isCreating ? (
            <form onSubmit={handleSubmit} className="bg-gray-100 p-4 rounded-lg border border-gray-300">
              <h3 className="font-medium mb-4 text-gray-800">
                {editingTheme ? "編輯主題" : "建立新主題"}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">
                    主題名稱 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border-2 border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    placeholder="請輸入主題名稱"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">
                    描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border-2 border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    placeholder="請輸入主題描述（選填）"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    主題顏色
                  </label>
                  <div className="flex space-x-2">
                    {THEME_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all shadow-sm ${
                          formData.color === color
                            ? "border-gray-800 scale-110 ring-2 ring-blue-300"
                            : "border-gray-500 hover:scale-105 hover:border-gray-700"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium shadow-sm"
                >
                  {editingTheme ? "更新主題" : "建立主題"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 font-medium shadow-sm"
                >
                  取消
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-800 hover:border-gray-400 hover:text-gray-600 transition-colors"
            >
              + 建立新主題
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
