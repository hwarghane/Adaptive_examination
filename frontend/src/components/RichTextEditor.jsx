import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ script: 'sub' }, { script: 'super' }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote', 'code-block'],
  ['link', 'image', 'formula'],
  [{ color: [] }, { background: [] }],
  ['clean'],
];

const FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'script', 'list', 'bullet', 'blockquote', 'code-block',
  'link', 'image', 'formula', 'color', 'background',
];

export default function RichTextEditor({ value = '', onChange, placeholder = 'Type here...', minHeight = 120 }) {
  return (
    <div className="rich-editor-wrapper">
      <style>{`
        .rich-editor-wrapper .ql-container { min-height: ${minHeight}px; font-size: 14px; }
        .rich-editor-wrapper .ql-editor { min-height: ${minHeight}px; }
        .rich-editor-wrapper .ql-toolbar { border-radius: 8px 8px 0 0; background: #f8fafc; }
        .rich-editor-wrapper .ql-container { border-radius: 0 0 8px 8px; }
        .rich-editor-wrapper .ql-toolbar, .rich-editor-wrapper .ql-container { border-color: #d1d5db; }
        .rich-editor-wrapper .ql-editor.ql-blank::before { color: #9ca3af; font-style: normal; }
      `}</style>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={{ toolbar: TOOLBAR }}
        formats={FORMATS}
      />
    </div>
  );
}

// Compact version for options (fewer toolbar items)
const OPTION_TOOLBAR = [
  ['bold', 'italic', 'underline'],
  [{ script: 'sub' }, { script: 'super' }],
  ['link', 'image', 'formula'],
  ['clean'],
];

export function OptionEditor({ value = '', onChange, placeholder = 'Option text...', index }) {
  return (
    <div className="option-editor-wrapper">
      <style>{`
        .option-editor-wrapper .ql-toolbar { border-radius: 6px 6px 0 0; background: #f8fafc; padding: 4px 8px; }
        .option-editor-wrapper .ql-container { border-radius: 0 0 6px 6px; min-height: 52px; font-size: 13px; }
        .option-editor-wrapper .ql-editor { min-height: 52px; padding: 6px 10px; }
        .option-editor-wrapper .ql-toolbar, .option-editor-wrapper .ql-container { border-color: #e5e7eb; }
        .option-editor-wrapper .ql-editor.ql-blank::before { color: #9ca3af; font-style: normal; }
        .option-editor-wrapper .ql-toolbar button { width: 22px; height: 22px; }
        .option-editor-wrapper .ql-toolbar .ql-formats { margin-right: 6px; }
      `}</style>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={{ toolbar: OPTION_TOOLBAR }}
        formats={['bold', 'italic', 'underline', 'script', 'link', 'image', 'formula']}
      />
    </div>
  );
}

// Render HTML safely in exam/result view
export function RichContent({ html, className = '' }) {
  if (!html) return null;
  // Strip empty paragraphs for display
  const cleaned = html.replace(/<p><br><\/p>/g, '').trim();
  if (!cleaned || cleaned === '<p></p>') return null;
  return (
    <div
      className={`rich-content prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ lineHeight: 1.6 }}
    />
  );
}
