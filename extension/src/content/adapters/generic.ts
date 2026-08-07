import{scanFields}from"../field-detection";import type{AtsAdapter}from"./types";export const genericAdapter:AtsAdapter={atsType:"GENERIC",scan:doc=>scanFields(doc,-.15)};
