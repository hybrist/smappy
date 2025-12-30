import { getServerCounter, updateServerCounter } from "../../action";
import { ClientCounter, WrappedServerCounter } from "../../client";

export async function GreetingCard({ name }: { name: string }) {
  const count = await getServerCounter();
  return (
    <div>
      <h1>
        Hello, {name}!
      </h1>
      <div className="card">
        <ClientCounter />
      </div>
      <div className="card">
        <WrappedServerCounter count={count}>
          <div>Wrapped Server Counter: {getServerCounter()}</div>
        </WrappedServerCounter>
      </div>
      <div className="card">
        <form action={updateServerCounter.bind(null, 1)}>
          <button>Server Counter: {getServerCounter()}</button>
        </form>
      </div>
      <div className="card">
        <form>
          <button formAction={updateServerCounter.bind(null, 1)}>Server Counter: {getServerCounter()}</button>
        </form>
      </div>
    </div>
  );
}
