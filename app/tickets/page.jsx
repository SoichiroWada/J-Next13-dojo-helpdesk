import { loadBindings } from "next/dist/build/swc";
import TicketList from "./TicketList";

export default function Tickets() {
  return (
    <main>
      <nav>
        <div>
          <h2>Tickets</h2>
          <p>
            <small>Currently open tickets.</small>
          </p>
        </div>
      </nav>
      <Suspense fallback={<Loading></Loading>}>
        <TicketList></TicketList>
      </Suspense>
    </main>
  );
}
