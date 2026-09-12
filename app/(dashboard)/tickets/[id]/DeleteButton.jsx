"use client";
import { useState } from "react";
import { useRouter } from 'next/navigation'

// icons & UI
import { TiDelete } from "react-icons/ti";

export default function DeleteButton({ id }) {
  console.log("Ticket ID:", id);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setIsDeleting(true);

    const res = await fetch(`http://192.168.1.68:3000/api/tickets/${id}`, {
      method: "DELETE",
    });
    const json = await res.json();

    if (json.error) {
      console.log(error);
      setIsLoading(false);
    }
    if (!json.error) {
      router.refresh();
      router.push("/tickets");
    }
  };

  return (
    <div className="flex justify-center">
      <button
        className="btn-primary"
        onClick={handleClick}
        disabled={isDeleting}
      >
        {isDeleting && (
          <>
            <TiDelete />
            Deleting....
          </>
        )}
        {!isDeleting && (
          <>
            <TiDelete />
            Delete Ticket
          </>
        )}
      </button>
    </div>
  );
}
