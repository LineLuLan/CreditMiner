package com.creditminer.cli;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CliArgsTest {

    @TempDir
    Path temporaryDirectory;

    @Test
    void parsesKebabCaseFlags() {
        CreditMinerCli.Options options = CreditMinerCli.Options.parse(new String[]{
                "--train-ratio", "0.75", "--seed", "7"
        });

        assertEquals(0.75, options.doubleValue("train-ratio", 0.8));
        assertEquals(7, options.intValue("seed", 42));
    }

    @Test
    void resolvesRelativeAndAbsolutePathsAgainstSuppliedWorkingDirectory() {
        Path relative = CreditMinerCli.resolve("data/train.arff", temporaryDirectory);
        Path absolute = temporaryDirectory.resolve("test.arff").toAbsolutePath().normalize();

        assertEquals(temporaryDirectory.resolve("data/train.arff").toAbsolutePath().normalize(), relative);
        assertEquals(absolute, CreditMinerCli.resolve(absolute.toString(), temporaryDirectory));
    }

    @Test
    void missingRequiredFlagAndUnknownCommandReturnUsageExitCode() {
        ByteArrayOutputStream errors = new ByteArrayOutputStream();
        PrintStream errorStream = new PrintStream(errors);

        int missing = CreditMinerCli.run(new String[]{"train", "--out", "models"},
                System.out, errorStream, temporaryDirectory);
        int unknown = CreditMinerCli.run(new String[]{"wat"},
                System.out, errorStream, temporaryDirectory);

        assertEquals(2, missing);
        assertEquals(2, unknown);
        assertTrue(errors.toString().contains("CreditMiner CLI"));
    }

    @Test
    void missingInputNamesResolvedAbsolutePathAndReturnsRuntimeExitCode() {
        ByteArrayOutputStream errors = new ByteArrayOutputStream();
        int exit = CreditMinerCli.run(new String[]{
                        "evaluate", "--model", "missing.model", "--test", "missing.arff"
                }, System.out, new PrintStream(errors), temporaryDirectory);

        assertEquals(1, exit);
        assertTrue(errors.toString().contains(temporaryDirectory.resolve("missing.model").toString()));
    }
}
