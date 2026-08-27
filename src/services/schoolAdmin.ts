import apiClient from '../lib/axios';
import type { ApiResponse } from '../types/api';

export interface SchoolImportInput {
    schoolCode?: string;
    name: string;
    active: boolean;
    aliases: string[];
    emailDomains: string[];
    externalIdentifiers: Record<string, string>;
}

export type SchoolImportAction = 'CREATE' | 'UPDATE' | 'UNCHANGED';

export interface SchoolImportResultItem {
    schoolCode: string | null;
    name: string;
    action: SchoolImportAction;
    aliases: string[];
    emailDomains: string[];
    externalIdentifiers: Record<string, string>;
}

export interface SchoolImportResult {
    dryRun: boolean;
    schools: SchoolImportResultItem[];
}

export interface SchoolCatalogItem {
    schoolCode: string;
    name: string;
    active: boolean;
    aliases: string[];
    emailDomains: string[];
    externalIdentifiers: Record<string, string>;
}

export const getSchoolCatalog = async (): Promise<SchoolCatalogItem[]> => {
    const response = await apiClient.get<ApiResponse<SchoolCatalogItem[]>>('/admin/schools');
    return response.data.data;
};

export const importSchools = async (
    schools: SchoolImportInput[],
    dryRun: boolean,
): Promise<SchoolImportResult> => {
    const response = await apiClient.post<ApiResponse<SchoolImportResult>>(
        '/admin/schools/import',
        { schools },
        { params: { dryRun } },
    );
    return response.data.data;
};
