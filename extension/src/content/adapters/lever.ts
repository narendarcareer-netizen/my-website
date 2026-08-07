import{scanFields}from"../field-detection";import type{AtsAdapter}from"./types";export const leverAdapter:AtsAdapter={atsType:"LEVER",scan:doc=>scanFields(doc,.04)};
