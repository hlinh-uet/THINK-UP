import { drizzle } from 'drizzle-orm/d1';
import { database } from '../lib/server';
import * as schema from './schema';
export function getDb(){return drizzle(database(),{schema})}
