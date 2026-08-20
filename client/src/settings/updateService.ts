import {getVersion} from '@tauri-apps/api/app';
export interface UpdateService { version():Promise<string>; check():Promise<null>; }
export const updateService:UpdateService={version:async()=>{try{return await getVersion()}catch{return '0.1.0'}},check:async()=>null};
