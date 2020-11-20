import { ParsedRefDoc } from "./internal.models";
import { logError } from "./logger";
import { IFirebaseWrapper } from "../providers/database/firebase/IFirebaseWrapper";

interface ParsedUpload {
  fieldDotsPath: string;
  fieldSlashesPath: string;
  rawFile: File | any;
}

interface ParsedDocRef {
  fieldDotsPath: string;
  refPath: string;
}

interface ParseResult {
  uploads: ParsedUpload[]
  refdocs: ParsedDocRef[]
}

export function parseDocGetAllUploads(obj: any): ParseResult {
  const isObject = !!obj && typeof obj === "object";
  const result: ParseResult = {
    uploads: [],
    refdocs: []
  }
  if (!isObject) {
    return result;
  }
  Object.keys(obj).map((key) => {
    const value = obj[key];
    recusivelyParseObjectValue(value, key, result);
  });
  return result;
}

export function recusivelyParseObjectValue(
  input: any,
  fieldPath: string,
  result: ParseResult
): any {
  const isFalsey = !input;
  if (isFalsey) {
    return input;
  }
  const isPrimitive = typeof input !== "object";
  if (isPrimitive) {
    return input;
  }
  const isTimestamp = !!input.toDate && typeof input.toDate === "function";
  if (isTimestamp) {
    return input.toDate();
  }
  const isArray = Array.isArray(input);
  if (isArray) {
    return (input as []).map((value, index) =>
      recusivelyParseObjectValue(value, `${fieldPath}.${index}`, result)
    );
  }
  const isObject = typeof input === "object";
  if (!isObject) {
    return;
  }
  const isRefField = !!input && input.hasOwnProperty("___refid");
  if (isRefField) {
    const refDoc = input as ParsedRefDoc;
    result.refdocs.push({
      fieldDotsPath: fieldPath,
      refPath: refDoc.___refpath
    });
    return;
  }
  const isFileField = !!input && input.hasOwnProperty("rawFile");
  if (isFileField) {
    result.uploads.push({
      fieldDotsPath: fieldPath,
      fieldSlashesPath: fieldPath.split('.').join('/'),
      rawFile: input.rawFile,
    });
    delete input.rawFile;
    return;
  }
  Object.keys(input).map((key) => {
    const value = input[key];
    recusivelyParseObjectValue(value, `${fieldPath}.${key}`, result);
  });
  return input;
}

export const recursivelyMapStorageUrls = async (
  fireWrapper: IFirebaseWrapper,
  fieldValue: any
): Promise<any> => {
  const isArray = Array.isArray(fieldValue);
  const isObject = !isArray && typeof fieldValue === "object";
  const isFileField = isObject && !!fieldValue && fieldValue.hasOwnProperty("src");
  if (isFileField) {
    try {
      const src = await fireWrapper.storage().ref(fieldValue.src).getDownloadURL();
      return {
        ...fieldValue,
        src
      };
    } catch (error) {
      logError(`Error when getting download URL`, {
        error
      });
      return fieldValue;
    }
  } else if (isObject) {
    for (let key in fieldValue) {
      if (fieldValue.hasOwnProperty(key)) {
        const value = fieldValue[key];
        fieldValue[key] = await recursivelyMapStorageUrls(fireWrapper, value);
      }
    }

    return fieldValue;
  } else if (isArray) {
    for (let i = 0; i < fieldValue.length; i++) {
      fieldValue[i] = await recursivelyMapStorageUrls(fireWrapper, fieldValue[i])
    }

    return fieldValue;
  }

  return fieldValue;
};
