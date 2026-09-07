"use client";
import { useRouter } from "next/navigation";

export default function DeleteButton({ id }) {
  const router = useRouter();
  
  const handleDelete = async () => {
    console.log("Ticket ID:", id);

    const res = await fetch(`http://192.168.1.68:4000/tickets/${id}`, {
      method: "DELETE",
    });
    setTimeout(()=>{console.log(res)}, 500);

    if (res.ok) {
      router.refresh();
      router.push("/tickets");
    }
  };

  return (
    <div className="flex justify-center">
      <button className="btn-primary" onClick={handleDelete}>
        Delete
      </button>
    </div>
  );
}
