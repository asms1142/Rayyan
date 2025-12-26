'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiMove } from 'react-icons/fi';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';


interface Token {
  token_id: number;
  token_number: string;
  token_title: string;
  token_description: string | null;
  priority: string;
  status: string;
  created_at: string;
  created_by: number;
  due_date: string;
  estimated_delivery_date: string | null;
  sort_order?: number;
  nickname?: string;
  org_id: number;
  project_id: number | null;
}

interface Props {
  projectId: number;
  projectName: string;
}

export default function TokensClient({ projectId, projectName }: Props) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedFeedbackToken, setSelectedFeedbackToken] = useState<Token | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showFeedbackPage, setShowFeedbackPage] = useState(false);
const [feedbackToken, setFeedbackToken] = useState<Token | null>(null);

  const fetchTokens = async () => {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });

    if (error || !data) {
      console.error('Error fetching tokens:', error);
      return;
    }

    const userIds = [...new Set(data.map((t) => t.created_by))];
    const { data: users } = await supabase
      .from('userinfo')
      .select('user_id, nickname')
      .in('user_id', userIds);

const mapped = data.map((t) => ({
  ...t,
  nickname: users?.find((u) => u.user_id === t.created_by)?.nickname || '—',
}));


    setTokens(mapped);
  };

  useEffect(() => {
    fetchTokens();
  }, [projectId]);

  const filteredTokens = tokens.filter((t) => {
    const matchSearch =
      t.token_number.toLowerCase().includes(search.toLowerCase()) ||
      t.token_title.toLowerCase().includes(search.toLowerCase());

    const matchPriority = priorityFilter ? t.priority === priorityFilter : true;
    const matchStatus = statusFilter ? t.status === statusFilter : true;

    return matchSearch && matchPriority && matchStatus;
  });

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tokens.findIndex((t) => t.token_id === active.id);
    const newIndex = tokens.findIndex((t) => t.token_id === over.id);

    const newOrder = arrayMove(tokens, oldIndex, newIndex);
    setTokens(newOrder);

    for (let idx = 0; idx < newOrder.length; idx++) {
      const t = newOrder[idx];
      const { error } = await supabase
        .from('tokens')
        .update({ sort_order: idx + 1 })
        .eq('token_id', t.token_id);

      if (error) {
        console.error('Failed to update sort_order:', error);
        fetchTokens();
        return;
      }
    }
  };

  const SortableRow = ({ token }: { token: Token }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id: token.token_id,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <tr ref={setNodeRef} style={style} className="hover:bg-blue-50 transition">
        <td className="border p-2 text-center">
          <span {...attributes} {...listeners} className="cursor-move text-gray-400">
            <FiMove />
          </span>
        </td>


        <td
          className="border p-2 font-medium cursor-pointer"
          onClick={() => setSelectedToken(token)}
        >
          {token.token_number}
        </td>
        <td className="border p-2 cursor-pointer" onClick={() => setSelectedToken(token)}>
          {token.token_title}
        </td>
        <td
          className="border p-2 text-gray-600 truncate max-w-[280px] cursor-pointer"
          onClick={() => setSelectedToken(token)}
        >
          {token.token_description
            ? token.token_description.replace(/<[^>]+>/g, '').slice(0, 90) + '...'
            : '—'}
        </td>

        
        <td className="border p-2">{token.priority}</td>
        <td className="border p-2">{token.status}</td>
        <td className="border p-2 text-center">
  <button
    className="text-blue-600 hover:underline text-sm"
    onClick={() => {
      setSelectedFeedbackToken(token);
      setShowFeedbackModal(true);
    }}
  >
    Add
  </button>
</td>

        <td className="border p-2 text-center">
  <button
    className="text-blue-600 hover:underline text-sm"
    onClick={() => {
      setFeedbackToken(token);
      setShowFeedbackPage(true);
    }}
  >
    View
  </button>
</td>

      </tr>
    );
  };

  return (
    <div className="relative p-4 max-w-full">
      <div className="mb-4 flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-lg font-semibold">{projectName} — Tokens</h2>

        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search token no or title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-3 py-2 w-64 max-w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm transition"
          >
            + Create Token
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={filteredTokens.map((t) => t.token_id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="overflow-auto border rounded bg-white shadow-sm">
            <table className="w-full border-collapse text-sm min-w-[900px]">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="border p-2 w-12">Drag</th>
                  <th className="border p-2">Token No</th>
                  <th className="border p-2">Title</th>
                  <th className="border p-2">Description</th>
                  <th className="border p-2">


                    <div className="flex flex-col gap-1">
                      <span>Priority</span>
                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="border text-xs p-1 rounded"
                      >
                        <option value="">All</option>
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </div>
                  </th>
                  <th className="border p-2">
                    <div className="flex flex-col gap-1">
                      <span>Status</span>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border text-xs p-1 rounded"
                      >
                        <option value="">All</option>
                        <option>Opened</option>
                        <option>In Progress</option>
                        <option>Held Up</option>
                        <option>Completed</option>
                        <option>Archived</option>
                      </select>
                    </div>
                  </th>
                  <th className="border p-2">Add</th>
                  <th className="border p-2">View</th>

                </tr>
              </thead>
              <tbody>
                {filteredTokens.length > 0 ? (
                  filteredTokens.map((t) => <SortableRow key={t.token_id} token={t} />)
                ) : (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500">
                      No tokens found
                    </td>
                    
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SortableContext>
      </DndContext>

      {selectedToken && (
        <TokenDrawer
          token={selectedToken}
          onClose={() => {
            setSelectedToken(null);
            fetchTokens();
          }}
        />
      )}

      {showCreate && (
        <CreateTokenModal
          projectId={projectId}
          onClose={() => setShowCreate(false)}
          onCreated={fetchTokens}
        />
      )}

      {showFeedbackPage && feedbackToken && (
  <FeedbackPage
    token={feedbackToken}
    onClose={() => {
      setShowFeedbackPage(false);
      setFeedbackToken(null);
    }}
  />
)}


      {showFeedbackModal && selectedFeedbackToken && (
  <AddFeedbackModal
    token={selectedFeedbackToken}
    onClose={() => {
      setShowFeedbackModal(false);
      setSelectedFeedbackToken(null);
    }}
    onFeedbackCreated={fetchTokens}
  />
)}

    </div>
  );
}

function generateTokenNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function generateUniqueTokenNumber(projectId: number): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const tokenNumber = generateTokenNumber();

    const { data, error } = await supabase
      .from('tokens')
      .select('token_number')
      .eq('project_id', projectId)
      .eq('token_number', tokenNumber)
      .maybeSingle();

    if (error) {
      console.error('Error checking token number uniqueness:', error);
      attempts++;
      continue;
    }

    if (!data) {
      return tokenNumber;
    }

    attempts++;
  }

  return generateTokenNumber() + Date.now().toString().slice(-2);
}

function CreateTokenModal({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [orgId, setOrgId] = useState<number | null>(null);

  const isBrowser = typeof window !== 'undefined';

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[200px] p-4 border rounded-b-md',
      },
    },
  });

  useEffect(() => {
    const loadUser = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      const { data, error } = await supabase
        .from('userinfo')
        .select('user_id, org_id')
        .eq('auth_uid', auth.user.id)
        .single();

      if (!error && data) {
        setUserId(data.user_id);
        setOrgId(data.org_id);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  const createToken = async () => {
    if (!title.trim() || !dueDate || !editor || editor.getHTML() === '<p></p>') {
      alert('Title, Due Date, and Description are required');
      return;
    }
    if (!userId || !orgId) {
      alert('User not authenticated');
      return;
    }

    setLoading(true);

    try {
      const tokenNumber = await generateUniqueTokenNumber(projectId);

      const { data: last } = await supabase
        .from('tokens')
        .select('sort_order')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      const nextOrder = (last?.sort_order || 0) + 1;

      const { data: token, error: insertError } = await supabase
        .from('tokens')
        .insert({
          project_id: projectId,
          org_id: orgId,
          token_number: tokenNumber,
          token_title: title.trim(),
          token_description: editor.getHTML(),
          priority,
          status: 'Opened',
          due_date: dueDate,
          sort_order: nextOrder,
          created_by: userId,
        })
        .select()
        .single();

      if (insertError || !token) {
        alert('Failed to create token: ' + (insertError?.message || 'Unknown error'));
        return;
      }

      if (file) {
        const filePath = `project-${projectId}/token-${token.token_id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('token-attachments')
          .upload(filePath, file);

        if (!uploadError) {
          await supabase.from('token_attachments').insert({
            token_id: token.token_id,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: userId,
          });
        }
      }

      setTitle('');
      setDueDate('');
      setPriority('Medium');
      setFile(null);
      editor?.commands.clearContent();
      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isBrowser) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
        <div className="bg-white w-[700px] max-w-full rounded-lg shadow-xl p-6">
          <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-[700px] max-w-full rounded-lg shadow-xl p-6 overflow-y-auto max-h-[90vh]">
        <h3 className="text-lg font-semibold mb-5">Create New Token</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title *</label>
            <input
              className="mt-1 border rounded-md p-2 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              placeholder="Enter token title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Priority</label>
              <select
                className="mt-1 border rounded-md p-2 w-full"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={loading}
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Due Date *</label>
              <input
                type="date"
                className="mt-1 border rounded-md p-2 w-full"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Description *</label>
            <div className="border rounded-md overflow-hidden shadow-sm">
              <div className="bg-gray-50 border-b px-3 py-2 flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`px-3 py-1 rounded font-bold transition-colors ${
                    editor?.isActive('bold')
                      ? 'bg-blue-200 text-blue-800'
                      : 'hover:bg-gray-200'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={loading || !editor}
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`px-3 py-1 rounded italic transition-colors ${
                    editor?.isActive('italic')
                      ? 'bg-blue-200 text-blue-800'
                      : 'hover:bg-gray-200'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={loading || !editor}
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={`px-3 py-1 rounded transition-colors ${
                    editor?.isActive('bulletList')
                      ? 'bg-blue-200 text-blue-800'
                      : 'hover:bg-gray-200'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={loading || !editor}
                >
                  • List
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={`px-3 py-1 rounded transition-colors ${
                    editor?.isActive('orderedList')
                      ? 'bg-blue-200 text-blue-800'
                      : 'hover:bg-gray-200'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={loading || !editor}
                >
                  1. List
                </button>
              </div>
              <EditorContent editor={editor} className="bg-white" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Attachment (optional)</label>
            <input
              type="file"
              className="mt-1 block text-sm"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={loading}
              accept="image/*,.pdf,.doc,.docx"
            />
            {file && (
              <div className="mt-1 text-xs text-gray-500">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-5 py-2 border rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={createToken}
            disabled={loading || !userId}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading && (
              <svg className="animate-spin -ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {loading ? 'Creating...' : 'Create Token'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddFeedbackModal({
  token,
  onClose,
  onFeedbackCreated,
}: {
  token: Token;
  onClose: () => void;
  onFeedbackCreated: () => void;
}) {
  const [status, setStatus] = useState(token.status);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [projectName, setProjectName] = useState<string>('—');
  const [tokenTitle, setTokenTitle] = useState<string>('—');

  console.log('📌 Modal opened for token:', token);

  // SSR-safe editor
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm focus:outline-none min-h-[200px] p-4 border rounded-md shadow-sm bg-white',
      },
    },
  });



  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      const { data } = await supabase
        .from('userinfo')
        .select('user_id')
        .eq('auth_uid', auth.user.id)
        .single();

      if (data?.user_id) setUserId(data.user_id);
    };
    loadUser();
  }, []);

  // Fetch project name + token title
  useEffect(() => {
    const fetchMeta = async () => {
      // Project name
      const { data: project, error: pErr } = await supabase
        .from('project')                 // ✅ correct table
        .select('project_name')
        .eq('project_id', token.project_id)
        .single();


      console.log('📌 Project fetch:', project, pErr);
      if (project?.project_name) setProjectName(project.project_name);

      // Token title
      const { data: tok, error: tErr } = await supabase
        .from('tokens')
        .select('token_title')
        .eq('token_id', token.token_id)
        .single();

      console.log('📌 Token title fetch:', tok, tErr);
      if (tok?.token_title) setTokenTitle(tok.token_title);
    };

    fetchMeta();
  }, [token.token_id, token.project_id]);

  const saveFeedback = async () => {
    if (!editor || !userId || editor.getHTML() === '<p></p>') {
      alert('Feedback is required.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('token_feedbacks').insert({
        token_id: token.token_id,
        token_details_description: editor.getHTML(),
        created_by: userId,
        org_id: token.org_id,
        project_id: token.project_id,
        status,
      });
      if (error) throw error;

      await supabase
        .from('tokens')
        .update({ status })
        .eq('token_id', token.token_id);

      onFeedbackCreated();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error saving feedback');
    } finally {
      setLoading(false);
    }
  };

  if (typeof window === 'undefined') return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-[720px] rounded-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto">

        {/* Header */}
<div className="flex justify-between border-b pb-3 mb-6">
  <div>
    <h2 className="text-xl font-bold">{token.token_number}</h2>
    <p className="text-sm text-gray-600 mt-1">{token.token_title}</p>
  </div>
  <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">×</button>
</div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div><b>Project:</b> {projectName}</div>
          <div><b>Created By:</b> {token.nickname ?? '—'}</div>
          <div><b>Created At:</b> {format(new Date(token.created_at), 'dd MMM yyyy')}</div>
          <div><b>Due Date:</b> {format(new Date(token.due_date), 'dd MMM yyyy')}</div>
          <div><b>Priority:</b> {token.priority}</div>
          <div><b>Status:</b> {status}</div>
        </div>

        {/* Editor */}
        <div className="mb-4">
          <label className="block font-medium mb-2">Feedback *</label>
          <EditorContent editor={editor} />
        </div>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border p-2 rounded w-full mb-6"
        >
          <option>Opened</option>
          <option>In Progress</option>
          <option>Held Up</option>
          <option>Completed</option>
          <option>Archived</option>
        </select>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t pt-4">
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          <button
            onClick={saveFeedback}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded"
          >
            {loading ? 'Saving...' : 'Save Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}



function FeedbackPage({ token, onClose }: { token: Token; onClose: () => void }) {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState<string>('—');
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal if click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Fetch feedbacks and project name
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch feedbacks
        const { data: fbData, error: fbError } = await supabase
          .from('token_feedbacks')
          .select('*')
          .eq('token_id', token.token_id)
          .order('created_at', { ascending: false });
        if (fbError) throw fbError;

        // Fetch nicknames
        const userIds = [...new Set(fbData.map(fb => fb.created_by))];
        const { data: users } = await supabase
          .from('userinfo')
          .select('user_id, nickname')
          .in('user_id', userIds);

        const mapped = fbData.map(fb => ({
          ...fb,
          created_by_nickname: users?.find(u => u.user_id === fb.created_by)?.nickname || '—',
        }));
        setFeedbacks(mapped);

        // Fetch Project Name
        const { data: project } = await supabase
          .from('project')
          .select('project_name')
          .eq('project_id', token.project_id)
          .single();

        if (project?.project_name) setProjectName(project.project_name);
      } catch (err) {
        console.error('Error fetching feedbacks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token.token_id, token.project_id]);

  if (typeof window === 'undefined') return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-start sm:items-center p-4 overflow-auto">
      <div
        ref={modalRef}
        className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b flex justify-between items-center p-6 z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-700">Token Feedback</h2>
            <p className="text-sm text-gray-500">{token.token_title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {/* Token Info */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 border-b bg-gray-50 text-sm">
          <div><span className="font-medium text-gray-600">Project:</span> {projectName}</div>
          <div><span className="font-medium text-gray-600">Token Number:</span> {token.token_number}</div>
          <div><span className="font-medium text-gray-600">Title:</span> {token.token_title}</div>
          <div><span className="font-medium text-gray-600">Created At:</span> {format(new Date(token.created_at), 'dd MMM yyyy')}</div>
          <div><span className="font-medium text-gray-600">Created By:</span> {token.nickname ?? '—'}</div>
          <div><span className="font-medium text-gray-600">Due Date:</span> {format(new Date(token.due_date), 'dd MMM yyyy')}</div>
          <div><span className="font-medium text-gray-600">Estimated Delivery:</span> {token.estimated_delivery_date ? format(new Date(token.estimated_delivery_date), 'dd MMM yyyy') : '—'}</div>
          <div><span className="font-medium text-gray-600">Status:</span> {token.status}</div>
        </div>

        {/* Feedbacks */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <div className="text-center text-gray-500 py-10">Loading feedbacks...</div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center text-gray-500 py-10">No feedbacks yet.</div>
          ) : (
            feedbacks.map(fb => (
              <div
                key={fb.token_feedback_id}
                className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{fb.created_by_nickname}</span>
                  <span>{format(new Date(fb.created_at), 'dd MMM yyyy, hh:mm a')}</span>
                </div>
                <div className="mb-2">
                  <span className="text-sm font-medium">Status:</span> {fb.status}
                </div>
                <div
                  className="prose prose-sm text-gray-700 max-w-full"
                  dangerouslySetInnerHTML={{ __html: fb.token_details_description }}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}




export function TokenDrawer({
  token,
  onClose,
}: {
  token: Token;
  onClose: () => void;
}) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [estimatedDate, setEstimatedDate] = useState(token.estimated_delivery_date || '');
  const [attachments, setAttachments] = useState<any[]>([]);

  // Close drawer when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Fetch attachments
  useEffect(() => {
    const fetchAttachments = async () => {
      const { data, error } = await supabase
        .from('token_attachments')
        .select('*')
        .eq('token_id', token.token_id)
        .order('created_at', { ascending: true });

      if (error) console.error('Error fetching attachments:', error);
      else setAttachments(data || []);
    };

    fetchAttachments();
  }, [token.token_id]);

  const saveEstimatedDate = async () => {
    if (!estimatedDate) return;
    const { error } = await supabase
      .from('tokens')
      .update({ estimated_delivery_date: estimatedDate })
      .eq('token_id', token.token_id);
    if (!error) onClose();
  };

  const badge = (text: string, color: string) => (
    <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>{text}</span>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex justify-end">
      <div ref={drawerRef} className="w-[460px] max-w-full bg-white h-full overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-start">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Token</div>
            <div className="text-2xl font-bold mt-1">{token.token_number}</div>
          </div>
          <button onClick={onClose} className="text-2xl hover:text-gray-600">✕</button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm">
          {/* Badges */}
          <div className="flex gap-3">
            {badge(
              token.priority,
              token.priority === 'High'
                ? 'bg-red-100 text-red-800'
                : token.priority === 'Medium'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            )}
            {badge(token.status, 'bg-blue-100 text-blue-800')}
          </div>

          {/* Token Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Created By</div>
              <div className="font-medium">{token.nickname || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Created On</div>
              <div>{format(new Date(token.created_at), 'dd MMM yyyy, hh:mm a')}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Due Date</div>
              <div className="font-medium">{format(new Date(token.due_date), 'dd MMM yyyy')}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Estimated Delivery</div>
              {token.estimated_delivery_date ? (
                <div>{format(new Date(token.estimated_delivery_date), 'dd MMM yyyy')}</div>
              ) : (
                <div className="flex gap-2 mt-2">
                  <input
                    type="date"
                    className="border rounded px-2 py-1 text-sm"
                    value={estimatedDate}
                    onChange={(e) => setEstimatedDate(e.target.value)}
                  />
                  <button
                    onClick={saveEstimatedDate}
                    className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <div className="text-xs text-gray-500 mb-1">Title</div>
            <div className="text-lg font-semibold">{token.token_title}</div>
          </div>

          {/* Description */}
          <div>
            <div className="text-xs text-gray-500 mb-2">Description</div>
            <div
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: token.token_description || '<em>No description</em>' }}
            />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-2">Attachments</div>
              <ul className="space-y-2">
                {attachments.map((att) => (
                  <li
                    key={att.id}
                    className="flex justify-between items-center border rounded p-2 bg-gray-50"
                  >
                    <span className="truncate max-w-[280px]">{att.file_name}</span>
                    <div className="flex gap-2">
                      <a
                        href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/token-attachments/${att.file_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs"
                      >
                        View
                      </a>
                      <a
                        href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/token-attachments/${att.file_path}`}
                        download={att.file_name}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Download
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
