import type{AtsType,DetectedField}from"../../shared/types";export interface AtsAdapter{atsType:AtsType;scan(doc:Document):DetectedField[]}
