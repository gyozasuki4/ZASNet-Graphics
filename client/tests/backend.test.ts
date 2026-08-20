import { describe, expect, it } from 'vitest';
import { normalizeBackendUrl } from '../src/api/backend';

describe('backend URL configuration',()=>{
  it('normalizes configurable HTTP and HTTPS origins',()=>{
    expect(normalizeBackendUrl(' http://10.10.3.133:8080/ ')).toBe('http://10.10.3.133:8080');
    expect(normalizeBackendUrl('https://backend.example.com/')).toBe('https://backend.example.com');
  });
  it('rejects unsupported schemes and credentials',()=>{
    expect(()=>normalizeBackendUrl('ftp://backend.example.com')).toThrow(/http/);
    expect(()=>normalizeBackendUrl('http://user:secret@backend.example.com')).toThrow(/credentials/);
  });
});
