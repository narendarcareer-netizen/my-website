export type AtsType="GREENHOUSE"|"LEVER"|"ASHBY"|"SMARTRECRUITERS"|"WORKABLE"|"WORKDAY"|"GENERIC"|"UNKNOWN";
export interface CareerSource{id:string;companyId:string;companyName:string;atsType:AtsType;identifier:string;sourceUrl:string;previousJobCount:number}
export interface Salary{min:number|null;max:number|null;currency:string|null}
export interface NormalizedSourceJob{externalId:string;title:string;company:string;location:string|null;workplaceType:"Remote"|"Hybrid"|"On-site"|null;employmentType:string|null;description:string;salary:Salary;sourceUrl:string;applyUrl:string;postedAt:string|null;updatedAt:string|null;sourceMetadata:Record<string,unknown>;contentHash:string}
export interface FetchContext{signal:AbortSignal;request:(url:string,init?:RequestInit)=>Promise<Response>}
export interface ConnectorHealth{ok:boolean;responseMs:number;errorCode?:string}
export interface JobSourceConnector<T=unknown>{readonly atsType:AtsType;readonly version:string;detect(url:URL):{confidence:number;identifier:string|null;reason:string};fetchJobs(source:CareerSource,context:FetchContext):Promise<T[]>;normalizeJob(raw:T,source:CareerSource):NormalizedSourceJob;healthCheck(source:CareerSource,context:FetchContext):Promise<ConnectorHealth>}
export interface ScanCounts{discovered:number;inserted:number;updated:number;unchanged:number;missing:number;closed:number}
