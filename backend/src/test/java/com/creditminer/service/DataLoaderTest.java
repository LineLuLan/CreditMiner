package com.creditminer.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import weka.core.Instances;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class DataLoaderTest {

    @TempDir
    Path temporaryDirectory;

    @Test
    void mapsCodesRenamesColumnsAndSetsDefaultClass() throws Exception {
        Path csv = temporaryDirectory.resolve("input.csv");
        Files.writeString(csv, """
                ID,LIMIT_BAL,SEX,EDUCATION,MARRIAGE,AGE,PAY_0,PAY_2,PAY_3,PAY_4,PAY_5,PAY_6,BILL_AMT1,BILL_AMT2,BILL_AMT3,BILL_AMT4,BILL_AMT5,BILL_AMT6,PAY_AMT1,PAY_AMT2,PAY_AMT3,PAY_AMT4,PAY_AMT5,PAY_AMT6,default payment next month
                1,20000,1,0,0,24,2,2,-1,-1,-2,-2,-50,3102,689,0,0,0,0,689,0,0,0,0,1
                2,120000,2,2,2,26,-1,2,0,0,0,2,2682,1725,2682,3272,3455,3261,0,1000,1000,1000,0,2000,0
                """);

        Instances data = new DataLoader().loadCsv(csv.toString());

        assertEquals(25, data.numAttributes());
        assertNull(data.attribute("PAY_0"));
        assertEquals("PAY_1", data.attribute(6).name());
        assertEquals("Default", data.classAttribute().name());
        assertEquals("Yes", data.instance(0).stringValue(data.classAttribute()));
        assertEquals("No", data.instance(1).stringValue(data.classAttribute()));
        assertEquals("Male", data.instance(0).stringValue(data.attribute("SEX")));
        assertEquals("Female", data.instance(1).stringValue(data.attribute("SEX")));
        assertEquals("Other", data.instance(0).stringValue(data.attribute("EDUCATION")));
        assertEquals("University", data.instance(1).stringValue(data.attribute("EDUCATION")));
        assertEquals("Other", data.instance(0).stringValue(data.attribute("MARRIAGE")));
        assertEquals("Single", data.instance(1).stringValue(data.attribute("MARRIAGE")));
        assertEquals(-50, data.instance(0).value(data.attribute("BILL_AMT1")));
    }
}
