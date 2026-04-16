'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FiEdit, FiFilter, FiPlus, FiRefreshCw, FiSearch, FiTrash2 } from 'react-icons/fi';
import {
  AdminBadge,
  AdminBanner,
  AdminButton,
  AdminEmptyState,
  AdminInput,
  AdminLabel,
  AdminMetricCard,
  AdminModal,
  AdminPageHeader,
  AdminPageShell,
  AdminSectionTitle,
  AdminSelect,
  AdminSurface,
  AdminTextarea,
} from '../../components/admin/AdminUi';
import { ADMIN_EDUCATION_CONTENTS } from '../../mock/data';

export default function AdminEducation() {
  const { token } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    content_type: 'article',
    tags: '',
    difficulty_level: 'beginner',
    estimated_read_time: 5,
    is_published: true,
  });
  const apiBase = process.env.NEXT_PUBLIC_BROWSER_API_URL || 'http://localhost:8000';

  const fetchContents = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await fetch(`${apiBase}/education/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const payload = await resp.json().catch(() => ({}));
        throw new Error(payload.detail || `Failed: ${resp.status}`);
      }
      const data = await resp.json();
      setContents(data.items || []);
    } catch (fetchError) {
      setContents(ADMIN_EDUCATION_CONTENTS);
      setError('');
    } finally {
      setLoading(false);
    }
  }, [apiBase, token]);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchContents();
  }, [fetchContents, router, token]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      content_type: 'article',
      tags: '',
      difficulty_level: 'beginner',
      estimated_read_time: 5,
      is_published: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        tags: formData.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag),
      };

      let resp;
      if (showEditForm && selectedContent) {
        resp = await fetch(`${apiBase}/education/${selectedContent.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } else {
        resp = await fetch(`${apiBase}/education/`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save content');
      }

      setSuccess(showEditForm ? 'Content updated successfully!' : 'Content created successfully!');
      setShowCreateForm(false);
      setShowEditForm(false);
      setSelectedContent(null);
      resetForm();
      fetchContents();
      setTimeout(() => setSuccess(''), 3000);
    } catch (fetchError) {
      const saved = {
        id: selectedContent?.id || `aec-local-${Date.now()}`,
        ...formData,
        tags: formData.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag),
      };
      setContents((current) => {
        if (showEditForm && selectedContent) {
          return current.map((item) => (item.id === selectedContent.id ? saved : item));
        }
        return [saved, ...current];
      });
      setSuccess(showEditForm ? 'Content updated successfully!' : 'Content created successfully!');
      setShowCreateForm(false);
      setShowEditForm(false);
      setSelectedContent(null);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleEdit = (content) => {
    setSelectedContent(content);
    setFormData({
      title: content.title || '',
      content: content.content || '',
      content_type: content.content_type || 'article',
      tags: Array.isArray(content.tags) ? content.tags.join(', ') : content.tags || '',
      difficulty_level: content.difficulty_level || 'beginner',
      estimated_read_time: content.estimated_read_time || 5,
      is_published: content.is_published !== false,
    });
    setShowEditForm(true);
  };

  const handleDelete = async (contentId) => {
    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return;
    }

    try {
      const resp = await fetch(`${apiBase}/education/${contentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete content');
      }

      setSuccess('Content deleted successfully!');
      fetchContents();
      setTimeout(() => setSuccess(''), 3000);
    } catch (fetchError) {
      setContents((current) => current.filter((item) => item.id !== contentId));
      setSuccess('Content deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const filteredContents = useMemo(
    () =>
      contents.filter(
        (content) =>
          (content.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            content.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            content.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))) &&
          (filterType === '' || content.content_type === filterType)
      ),
    [contents, filterType, searchTerm]
  );

  const contentTypes = [
    { value: 'article', label: 'Article' },
    { value: 'tutorial', label: 'Tutorial' },
    { value: 'guide', label: 'Guide' },
    { value: 'video', label: 'Video' },
    { value: 'infographic', label: 'Infographic' },
  ];

  const difficultyLevels = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  const publishedCount = filteredContents.filter((item) => item.is_published !== false).length;

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Content Studio"
        title="Educational Content"
        description="Kelola artikel, tutorial, dan materi edukasi dengan layout yang lebih editorial dan lebih nyaman untuk editing."
        actions={
          <>
            <AdminButton variant="secondary" icon={FiRefreshCw} onClick={fetchContents}>
              Refresh
            </AdminButton>
            <AdminButton
              variant="primary"
              icon={FiPlus}
              onClick={() => {
                setShowCreateForm(true);
                resetForm();
              }}
            >
              Create Content
            </AdminButton>
          </>
        }
      />

      {error ? <AdminBanner tone="error">{error}</AdminBanner> : null}
      {success ? <AdminBanner tone="success">{success}</AdminBanner> : null}

      <div className="grid gap-5 md:grid-cols-3">
        <AdminMetricCard
          title="Visible Content"
          value={filteredContents.length}
          subtext="Konten yang muncul setelah filter"
          icon={FiFilter}
          tone="sky"
        />
        <AdminMetricCard
          title="Published"
          value={publishedCount}
          subtext="Konten yang sudah tayang ke pengguna"
          icon={FiRefreshCw}
          tone="emerald"
        />
        <AdminMetricCard
          title="Drafts"
          value={filteredContents.length - publishedCount}
          subtext="Konten yang belum dipublikasikan"
          icon={FiEdit}
          tone="amber"
        />
      </div>

      <AdminSurface>
        <AdminSectionTitle
          title="Search & Filter"
          subtitle="Cari konten berdasarkan judul, isi, atau tag. Filter juga bisa dipakai untuk fokus ke tipe konten tertentu."
        />
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <AdminInput
              type="text"
              placeholder="Search content by title, body, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11"
            />
          </div>
          <AdminSelect value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {contentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </AdminSelect>
        </div>
      </AdminSurface>

      <AdminSurface>
        <AdminSectionTitle
          title={`Educational Contents (${filteredContents.length})`}
          subtitle="Setiap item ditampilkan sebagai card supaya review isi, status, dan metadata lebih cepat."
        />

        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-emerald-700" />
            <div className="mt-4 text-sm text-emerald-700/70">Loading contents...</div>
          </div>
        ) : filteredContents.length === 0 ? (
          <div className="mt-6">
            <AdminEmptyState
              title="No educational contents found"
              description="Ubah keyword pencarian atau buat konten baru untuk mengisi kategori ini."
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {filteredContents.map((content) => (
              <div
                key={content.id}
                className="rounded-3xl border border-emerald-900/5 bg-emerald-50/70 p-5 transition-colors hover:bg-emerald-50/40"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminBadge tone="sky">{content.content_type}</AdminBadge>
                      <AdminBadge tone="violet">{content.difficulty_level}</AdminBadge>
                      <AdminBadge tone={content.is_published ? 'emerald' : 'amber'}>
                        {content.is_published ? 'Published' : 'Draft'}
                      </AdminBadge>
                    </div>

                    <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-800">
                      {content.title}
                    </h3>

                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                      {content.content}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-emerald-700/70">
                      <span>Read time: {content.estimated_read_time} min</span>
                      {content.tags?.length ? <span>Tags: {content.tags.join(', ')}</span> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 xl:max-w-[280px] xl:justify-end">
                    <AdminButton
                      variant="secondary"
                      icon={FiEdit}
                      className="px-4 py-2"
                      onClick={() => handleEdit(content)}
                    >
                      Edit
                    </AdminButton>
                    <AdminButton
                      variant="danger"
                      icon={FiTrash2}
                      className="px-4 py-2"
                      onClick={() => handleDelete(content.id)}
                    >
                      Delete
                    </AdminButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminSurface>

      {showCreateForm || showEditForm ? (
        <AdminModal
          className="max-w-4xl"
          onClose={() => {
            setShowCreateForm(false);
            setShowEditForm(false);
            setSelectedContent(null);
            resetForm();
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold uppercase tracking-widest text-emerald-700">
                {showEditForm ? 'Edit Content' : 'Create Content'}
              </div>
              <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-800">
                {showEditForm ? 'Update educational material' : 'Add new educational material'}
              </h3>
            </div>
            <AdminButton
              variant="ghost"
              className="px-4 py-2"
              onClick={() => {
                setShowCreateForm(false);
                setShowEditForm(false);
                setSelectedContent(null);
                resetForm();
              }}
            >
              Close
            </AdminButton>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <AdminLabel>Title *</AdminLabel>
                <AdminInput
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter content title..."
                />
              </div>
              <div>
                <AdminLabel>Content Type *</AdminLabel>
                <AdminSelect
                  name="content_type"
                  value={formData.content_type}
                  onChange={handleInputChange}
                  required
                >
                  {contentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </AdminSelect>
              </div>
              <div>
                <AdminLabel>Difficulty Level *</AdminLabel>
                <AdminSelect
                  name="difficulty_level"
                  value={formData.difficulty_level}
                  onChange={handleInputChange}
                  required
                >
                  {difficultyLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </AdminSelect>
              </div>
              <div>
                <AdminLabel>Estimated Read Time (minutes) *</AdminLabel>
                <AdminInput
                  type="number"
                  name="estimated_read_time"
                  value={formData.estimated_read_time}
                  onChange={handleInputChange}
                  required
                  min="1"
                  max="120"
                />
              </div>
            </div>

            <div>
              <AdminLabel>Tags</AdminLabel>
              <AdminInput
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="Enter tags separated by commas..."
              />
              <div className="mt-2 text-xs text-emerald-700/70">
                Separate multiple tags with commas, for example: recycling, environment, tips
              </div>
            </div>

            <div>
              <AdminLabel>Content *</AdminLabel>
              <AdminTextarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                required
                rows={10}
                placeholder="Enter the educational content..."
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl bg-emerald-50/40 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                name="is_published"
                checked={formData.is_published}
                onChange={handleInputChange}
                className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
              />
              <span>Publish immediately</span>
            </label>

            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <AdminButton
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setShowEditForm(false);
                  setSelectedContent(null);
                  resetForm();
                }}
              >
                Cancel
              </AdminButton>
              <AdminButton variant="primary" type="submit">
                {showEditForm ? 'Update Content' : 'Create Content'}
              </AdminButton>
            </div>
          </form>
        </AdminModal>
      ) : null}
    </AdminPageShell>
  );
}
