import { useState } from 'react';
import { Plus } from 'lucide-react';
import AddBookmarkModal from './AddBookmarkModal.jsx';

export default function AddBookmarkButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" /> Add
      </button>
      {open && <AddBookmarkModal onClose={() => setOpen(false)} />}
    </>
  );
}
