"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// icons & UI
import { TiDelete } from "react-icons/ti";

export default function DeleteButton({ id }) {
  console.log("Ticket ID:", id);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (json.error) {
        console.log("Delete error:", json.error);
        setIsDeleting(false);
      }
      router.refresh();
      router.push("/tickets");
    } catch (error) {
      console.log("Delete request failed:", error);
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
    </div>
  );
}
