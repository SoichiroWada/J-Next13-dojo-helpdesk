"use client";
import { getErrorMessage } from "@/utils/errors";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTicket } from "@/utils/firebase/tickets";

interface DeleteButtonProps {
  id: string;
}

export default function DeleteButton({ id }: DeleteButtonProps) {
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    if (isDeleting) return;
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;
    setIsDeleting(true);
    setError("");
    try {
      await deleteTicket(id);
      router.push("/tickets");
    } catch (error) {
      setError(getErrorMessage(error));
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col items-start">
      <button
        className="btn-delete"
        onClick={handleClick}
        disabled={isDeleting}
      >
        {isDeleting ? "Deleting...." : "Delete Ticket"}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
