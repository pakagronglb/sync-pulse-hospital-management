"use server";

import { ID, InputFile, Query } from "node-appwrite";

import {
  BUCKET_ID,
  DATABASE_ID,
  ENDPOINT,
  PATIENT_COLLECTION_ID,
  PROJECT_ID,
  databases,
  storage,
  users,
} from "../appwrite.config";
import { parseStringify } from "../utils";

// CREATE APPWRITE USER
export const createUser = async (user: CreateUserParams) => {
  try {
    // Create new user -> https://appwrite.io/docs/references/1.5.x/server-nodejs/users#create
    const newuser = await users.create(
      ID.unique(),
      user.email,
      user.phone,
      undefined,
      user.name
    );

    return parseStringify(newuser);
  } catch (error: any) {
    // Check existing user
    if (error && error?.code === 409) {
      const existingUser = await users.list([
        Query.equal("email", [user.email]),
      ]);

      return existingUser.users[0];
    }
    console.error("An error occurred while creating a new user:", error);
  }
};

// GET USER
export const getUser = async (userId: string) => {
  try {
    const user = await users.get(userId);

    return parseStringify(user);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the user details:",
      error
    );
  }
};

// REGISTER PATIENT
export const registerPatient = async ({
  identificationDocument,
  birthDate,
  ...patient
}: RegisterUserParams) => {
  try {
    // Comprehensive logging of input parameters
    console.log('Input Parameters:', {
      birthDateType: typeof birthDate,
      birthDateValue: birthDate,
      patientKeys: Object.keys(patient),
      identificationDocument: identificationDocument ? 'Present' : 'Not Present'
    });

    // Upload file ->  // https://appwrite.io/docs/references/cloud/client-web/storage#createFile
    let file;
    if (identificationDocument) {
      const inputFile =
        identificationDocument &&
        InputFile.fromBlob(
          identificationDocument?.get("blobFile") as Blob,
          identificationDocument?.get("fileName") as string
        );

      file = await storage.createFile(BUCKET_ID!, ID.unique(), inputFile);
    }

    // Prepare document data with explicit attribute handling
    const documentData: Record<string, any> = {
      userId: patient.userId, // Explicitly include userId
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      gender: patient.gender.toLowerCase(),
      address: patient.address,
      occupation: patient.occupation,
      emergencyContactName: patient.emergencyContactName,
      emergencyContactNumber: patient.emergencyContactNumber,
      primaryPhysician: patient.primaryPhysician,
      insuranceProvider: patient.insuranceProvider,
      insurancePolicyNumber: patient.insurancePolicyNumber,
      
      // Optional fields
      ...(patient.allergies && { allergies: patient.allergies }),
      ...(patient.currentMedication && { currentMedication: patient.currentMedication }),
      ...(patient.familyMedicalHistory && { familyMedicalHistory: patient.familyMedicalHistory }),
      ...(patient.pastMedicalHistory && { pastMedicalHistory: patient.pastMedicalHistory }),
      ...(patient.identificationType && { identificationType: patient.identificationType }),
      ...(patient.identificationNumber && { identificationNumber: patient.identificationNumber }),
      
      // Handle birthDate 
      ...(birthDate && { 
        birthDate: birthDate instanceof Date 
          ? birthDate.toISOString() 
          : new Date(birthDate).toISOString()
      }),

      // File-related fields
      identificationDocumentId: file?.$id ? file.$id : null,
      identificationDocumentUrl: file?.$id
        ? `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${file.$id}/view??project=${PROJECT_ID}`
        : null,
      
      // Consent fields
      privacyConsent: patient.privacyConsent,
    };

    // Extensive logging of document data
    console.log('Document Data Keys:', Object.keys(documentData));
    console.log('Full Document Data:', JSON.stringify(documentData, null, 2));

    // Create new patient document -> https://appwrite.io/docs/references/cloud/server-nodejs/databases#createDocument
    const newPatient = await databases.createDocument(
      DATABASE_ID!,
      PATIENT_COLLECTION_ID!,
      ID.unique(),
      documentData
    );

    return parseStringify(newPatient);
  } catch (error: any) {
    // More detailed error logging
    console.error("Appwrite Error Code:", error.code);
    console.error("Appwrite Error Type:", error.type);
    console.error("Full error details:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    // Specific error handling for Appwrite beta
    if (error.type === 'document_invalid_structure') {
      console.error("Possible schema mismatch. Please check your Appwrite collection attributes.");
    }
    
    throw error; // Re-throw to allow caller to handle
  }
};

// GET PATIENT
export const getPatient = async (userId: string) => {
  try {
    const patients = await databases.listDocuments(
      DATABASE_ID!,
      PATIENT_COLLECTION_ID!,
      [Query.equal("userId", [userId])]
    );

    return parseStringify(patients.documents[0]);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the patient details:",
      error
    );
  }
};
