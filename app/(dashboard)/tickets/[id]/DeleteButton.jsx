"use client";
import { useState } from "react";

// icons & UI
import { TiDelete } from "react-icons/ti";

export default function DeleteButton({ id }) {
  console.log("Ticket ID:", id);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClick = async () => {
    setIsDeleting(true);
    console.log("deleting id - ", id);
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
