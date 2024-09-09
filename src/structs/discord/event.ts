import { Events } from "discord.js";

export interface EventHandler<T> {
    name: Events;
    execute: (event: T) => Promise<void>;
}
