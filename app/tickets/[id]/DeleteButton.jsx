"use client";

export default async function DeleteButton({ id }) {
  const handleDelete = () => {
    console.log("Ticket ID:", id);

    const res = await fetch("http://192.168.1.68:4000/tickets/${id}", {
      method: "DELETE",
    });
    if (res.status === 200 | res.status === 204) {
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
