"use client";

import { useState, FormEvent } from "react";
import { useChat, UIMessage } from "@ai-sdk/react";

type WeatherToolResult = {
  location: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed?: number;
  windGust?: number;
  conditions?: string;
};

type MovieToolResult = {
  title: string;
  year: string;
  rated?: string;
  released?: string;
  runtime?: string;
  genre?: string;
  director?: string;
  actors?: string;
  plot?: string;
  poster?: string;
  imdbRating?: string;
};

function SimpleMarkdown({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let key = 0;
  const re =
    /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(<span key={`t-${key++}`}>{text.slice(last, m.index)}</span>);
    if (m[1] && m[2]) {
      nodes.push(
        <img
          key={`img-${key++}`}
          src={m[2]}
          alt={m[1] || "image"}
          className="my-2 rounded max-h-64 object-contain"
        />,
      );
    } else if (m[3] && m[4]) {
      nodes.push(
        <a
          key={`a-${key++}`}
          href={m[4]}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          {m[3]}
        </a>,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(<span key={`t-${key++}`}>{text.slice(last)}</span>);
  return <>{nodes}</>;
}

// ---- message renderer for v5 parts ----
function RenderMessage({ message }: { message: UIMessage }) {
  if ("parts" in message && Array.isArray(message.parts)) {
    return (
      <>
        {message.parts.map((p: any, i: number) => {
          if (p.type === "text") {
            return (
              <div key={`t-${message.id}-${i}`} className="whitespace-pre-wrap">
                <SimpleMarkdown text={p.text ?? ""} />
              </div>
            );
          }
          if (p.type === "image") {
            const url = p.imageUrl || p.url;
            return typeof url === "string" ? (
              <img
                key={`img-${message.id}-${i}`}
                src={url}
                alt="image"
                className="my-2 rounded max-h-64 object-contain"
              />
            ) : null;
          }
          return null;
        })}
      </>
    );
  }

  return (
    <div className="whitespace-pre-wrap">
      <SimpleMarkdown text={(message as any).content ?? ""} />
    </div>
  );
}

function getToolCards(message_parts: any) {
  const cards: React.ReactNode[] = [];
  
  message_parts.forEach((msg: any) => {
    if (msg.type === "tool-weatherTool" && msg.output) {
      cards.push(
        <div key={`${msg.toolCallId}-weather`} className="mt-3">
          <WeatherCard data={msg.output as WeatherToolResult} />
        </div>,
      );
    }
    
    if (msg.type === "tool-movieTool" && msg.output) {
      cards.push(
        <div key={`${msg.toolCallId}-movie`} className="mt-3">
          <MovieCard data={msg.output as MovieToolResult} />
        </div>,
      );
    }
  });

  return cards;
}

export default function Chat() {
  const { messages, sendMessage, stop, status } = useChat();
  console.log(messages);
  const [input, setInput] = useState("");

  const isLoading = status !== "ready";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = input.trim();
    if (!value) return;
    sendMessage({ role: "user", parts: [{ type: "text", text: value }] });
    setInput("");
  };

  return (
    <div
      className="h-screen w-screen flex bg-slate-900"
    >
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="text-6xl mb-4">🌤️</div>
          <h2 className="text-2xl font-semibold mb-2">Weather Assistant</h2>
          <p className="text-lg">Ask me about weather or movies!</p>
          <div className="mt-8 space-y-2 text-sm">
            <p>Try asking:</p>
            <p>• "What's the weather in San Francisco?"</p>
            <p>• "Tell me about the movie Inception"</p>
          </div>
        </div>
      </div>

      <div className="w-130 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-xl font-semibold text-white">Weather Assistant</h1>
          <p className="text-sm text-slate-400 mt-1">
            Ask about weather or movies, or update shared state
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1;
            const isAssistantMessage = message.role === "assistant";
            const showLoading = isLoading && isLastMessage && isAssistantMessage;

            return (
              <div
                key={message.id}
                className={`${message.role === "user" ? "ml-8" : "mr-8"}`}
              >
                <div
                  className={`rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-200"
                  }`}
                >
                  <div className="text-sm font-medium mb-1 flex items-center gap-2">
                    <p className="font-bold">{message.role === "user" ? "You" : "Assistant"}</p>
                    {showLoading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
                    )}
                  </div>

                  {!isAssistantMessage && <RenderMessage message={message} />}

                  {getToolCards(message.parts)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-700">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about weather or movies..."
              className="flex-1 bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Send
            </button>
            {
              isLoading && (
                <button
                  type="button"
                  onClick={stop}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                >
                  Stop
                </button>
              )
            }

          </form>

        </div>
      </div>
    </div>
  );
}

function WeatherCard({ data }: { data: WeatherToolResult }) {
  return (
    <div className="rounded-2xl max-w-md w-full text-white p-4 bg-indigo-600">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Weather</h2>
        <span className="text-sm opacity-90">{data.location}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="bg-white/10 rounded-lg p-3">
          <div className="opacity-80">Temperature</div>
          <div className="text-lg font-medium">{data.temperature}°C</div>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <div className="opacity-80">Feels like</div>
          <div className="text-lg font-medium">{data.feelsLike}°C</div>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <div className="opacity-80">Humidity</div>
          <div className="text-lg font-medium">{data.humidity}%</div>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <div className="opacity-80">Wind speed</div>
          <div className="text-lg font-medium">
            {data.windSpeed ?? "—"} km/h
          </div>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <div className="opacity-80">Wind gust</div>
          <div className="text-lg font-medium">
            {data.windGust ?? "—"} km/h
          </div>
        </div>
        <div className="bg-white/10 rounded-lg p-3 col-span-2">
          <div className="opacity-80">Conditions</div>
          <div className="text-lg font-medium">{data.conditions ?? "—"}</div>
        </div>
      </div>
    </div>
  );
}

function MovieCard({ data }: { data: MovieToolResult }) {
  return (
    <div className="rounded-2xl max-w-md w-full text-white p-4 bg-slate-800">
      <div className="flex gap-4">
        {data.poster && (
          <img
            src={data.poster}
            alt={`${data.title} poster`}
            className="w-24 h-36 object-cover rounded"
          />
        )}
        <div className="flex-1">
          <h2 className="text-xl font-semibold">
            {data.title}{" "}
            <span className="opacity-80 font-normal">({data.year})</span>
          </h2>
          <div className="text-sm opacity-80 mt-1">
            {[data.rated, data.runtime, data.genre].filter(Boolean).join(" • ")}
          </div>
          {data.imdbRating && (
            <div className="mt-1 text-sm">
              IMDb: <span className="font-medium">{data.imdbRating}</span>
            </div>
          )}
        </div>
      </div>
      {data.plot && <p className="text-sm mt-3 opacity-90">{data.plot}</p>}
      <div className="grid grid-cols-2 gap-3 text-xs mt-3 opacity-90">
        {data.released && (
          <div className="bg-white/10 rounded p-2">
            <span className="opacity-80">Released</span>
            <div className="font-medium">{data.released}</div>
          </div>
        )}
        {data.director && (
          <div className="bg-white/10 rounded p-2">
            <span className="opacity-80">Director</span>
            <div className="font-medium">{data.director}</div>
          </div>
        )}
        {data.actors && (
          <div className="bg-white/10 rounded p-2 col-span-2">
            <span className="opacity-80">Actors</span>
            <div className="font-medium">{data.actors}</div>
          </div>
        )}
      </div>
    </div>
  );
}
