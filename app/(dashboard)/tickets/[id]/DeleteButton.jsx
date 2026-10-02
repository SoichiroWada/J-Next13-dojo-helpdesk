"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTicket } from "@/utils/firebase/tickets";

// icons & UI
import { TiDelete } from "react-icons/ti";

export default function DeleteButton({ id }) {
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setError("");
    try {
      await deleteTicket(id);
      router.push("/tickets");
    } catch (error) {
      setError(error.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex justify-center">
      <button
        className="btn-primary"
        onClick={handleClick}
        disabled={isDeleting}
      >
        <TiDelete />
        {isDeleting ? "Deleting...." : "Delete Ticket"}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
