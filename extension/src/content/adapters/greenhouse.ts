import{scanFields}from"../field-detection";import type{AtsAdapter}from"./types";export const greenhouseAdapter:AtsAdapter={atsType:"GREENHOUSE",scan:doc=>scanFields(doc,.05)};
