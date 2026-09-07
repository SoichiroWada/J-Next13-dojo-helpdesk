"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteButton({ id }) {
  console.log("Ticket ID:", id);
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setIsDeleting(true);
    setError("");

    try {
      const res = await fetch(`http://192.168.1.68:4000/tickets/${id}`, {
        method: "DELETE",
      });
      console.log(res);
      if (!res.ok) {
        throw new Error(`Delete failed: ${res.status}`);
      }
      router.push("/tickets");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex justify-center">
      <button
        className="btn-primary"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
