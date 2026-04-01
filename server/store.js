import { createClient } from '@supabase/supabase-js';

export default class Store {
  constructor() {
    this.rooms = new Map();
    this.supabase = null;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }
  }

  async saveRoom(room) {
    this.rooms.set(room.code, room);
    if (!this.supabase) return;
    await this.supabase.from('rooms').upsert({
      code: room.code,
      state: room,
      updated_at: new Date().toISOString()
    });
  }

  async getRoom(code) {
    if (this.rooms.has(code)) return this.rooms.get(code);
    if (!this.supabase) return null;
    const { data, error } = await this.supabase
      .from('rooms')
      .select('state')
      .eq('code', code)
      .single();
    if (error) return null;
    if (data?.state) {
      this.rooms.set(code, data.state);
      return data.state;
    }
    return null;
  }

  async deleteRoom(code) {
    this.rooms.delete(code);
    if (!this.supabase) return;
    await this.supabase.from('rooms').delete().eq('code', code);
  }
}
