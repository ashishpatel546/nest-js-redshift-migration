export declare enum StatusOptions {
    SUCCESS = "SUCCESS",
    FAIL = "FAIL"
}
export interface ResponseStatus<T> {
    msg: StatusOptions;
    description?: string;
    data?: T;
}
