package com.dotcms.experiments.business.web;

import static com.dotcms.util.CollectionsUtils.list;

import com.dotcms.experiments.model.Experiment;
import com.dotcms.experiments.model.ExperimentVariant;
import com.dotcms.experiments.model.TrafficProportion;
import com.dotmarketing.business.APILocator;
import com.dotmarketing.exception.DotDataException;
import com.dotmarketing.exception.DotRuntimeException;
import com.dotmarketing.exception.DotSecurityException;
import com.dotmarketing.portlets.contentlet.model.Contentlet;
import com.dotmarketing.portlets.htmlpageasset.model.HTMLPageAsset;
import com.dotmarketing.portlets.rules.model.Rule;
import com.dotmarketing.util.Config;
import com.dotmarketing.util.UtilMethods;
import com.liferay.util.StringPool;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;

import java.util.Collections;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import net.bytebuddy.utility.RandomString;


/**
 * Default implementation of {@link ExperimentWebAPI}
 */
public class ExperimentWebAPIImpl implements ExperimentWebAPI {

    @Override
    public SelectedExperiments isUserIncluded(final HttpServletRequest request,
            final HttpServletResponse response, final List<String> idsToExclude)
            throws DotDataException, DotSecurityException {

        final List<Experiment> experimentsRunning = APILocator.getExperimentsAPI()
                .getRunningExperiments();
        final List<Experiment> experimentFiltered = UtilMethods.isSet(idsToExclude) ?
                experimentsRunning.stream()
                    .filter(experiment -> !idsToExclude.contains(experiment.id().get()))
                    .collect(Collectors.toList()) : experimentsRunning;

        final List<Experiment> experiments = pickExperiments(experimentFiltered, request, response);
        final List<SelectedExperiment> selectedExperiments = !experiments.isEmpty() ?
                getSelectedExperimentsResult(experiments)
                : getNoneExperimentListResult();

        return new SelectedExperiments(selectedExperiments,
                experimentFiltered.stream().map(experiment -> experiment.id().get()).collect(Collectors.toList()),
                UtilMethods.isSet(idsToExclude) ? new ArrayList(idsToExclude) : Collections.EMPTY_LIST);
    }

    private List<SelectedExperiment> getSelectedExperimentsResult(final List<Experiment> experiments) {
        return experiments.stream()
                    .map(experiment -> createSelectedExperiment (experiment))
                    .collect(Collectors.toList());
    }

    private List<SelectedExperiment> getNoneExperimentListResult() {
        return list(NONE_EXPERIMENT);
    }

    private String nextLookBackWindow(){
        return new RandomString(20).nextString();
    }

    private SelectedExperiment createSelectedExperiment(final Experiment experiment) {
        final SelectedVariant variantSelected = pickOneVariant(experiment);
        return getExperimentSelected(experiment, variantSelected);
    }

    private SelectedVariant pickOneVariant(final Experiment experiment) {
        final int randomValue = nextRandomNumber();

        final TrafficProportion trafficProportion = experiment.trafficProportion();
        float totalWeight = 0;

        for (ExperimentVariant variant : trafficProportion.variants()) {
            totalWeight += variant.weight();

            if (randomValue < totalWeight) {
                return new SelectedVariant(variant.id(), variant.url().orElse(StringPool.BLANK));
            }
        }

        throw new IllegalStateException(
                String.format("Should return one variant for the Experiment: %s - %s", experiment.id(),
                        experiment.name()));
    }

    private int nextRandomNumber() {
        return (int) (Math.random() * 100);
    }

    private SelectedExperiment getExperimentSelected(final Experiment experiment,
            final SelectedVariant variantSelected) {

        final HTMLPageAsset htmlPageAsset = getHtmlPageAsset(experiment);

        if (!UtilMethods.isSet(htmlPageAsset)) {
            throw new RuntimeException("Page not found: " + experiment.pageId());
        }

        try {
            return new SelectedExperiment.Builder()
                    .id(experiment.id().orElse(StringPool.BLANK))
                    .name(experiment.name())
                    .pageUrl(htmlPageAsset.getURI())
                    .variant(variantSelected)
                    .lookBackWindow(nextLookBackWindow())
                    .build();
        } catch (DotDataException e) {
            throw new DotRuntimeException(e);
        }
    }

    private List<Experiment> pickExperiments(final List<Experiment> runningExperiments,
            final HttpServletRequest request, final HttpServletResponse response)
            throws DotDataException, DotSecurityException {

        final List<Experiment> experiments = new ArrayList<>();

        for (final Experiment experiment : runningExperiments) {
            final int randomValue = nextRandomNumber();

            if (randomValue < experiment.trafficAllocation()) {
                if (this.checkRule(experiment, request, response)) {
                    experiments.add(experiment);
                }
            }
        }

        return experiments;
    }

    private HTMLPageAsset getHtmlPageAsset(final Experiment experiment) {

        try {
            final Contentlet contentlet = APILocator.getContentletAPI()
                    .findContentletByIdentifierAnyLanguage(experiment.pageId(), false);
            final HTMLPageAsset htmlPageAsset = APILocator.getHTMLPageAssetAPI()
                    .fromContentlet(contentlet);
            return htmlPageAsset;
        } catch (DotDataException e) {
            throw new DotRuntimeException(e);
        }
    }

    private boolean checkRule(final Experiment experiment, final HttpServletRequest request,
            final HttpServletResponse response) throws DotDataException, DotSecurityException {

        final Optional<Rule> rule = APILocator.getExperimentsAPI().getRule(experiment);

        if (!rule.isPresent()) {
            return true;
        }

        rule.get().checkValid();
        return rule.get().evaluate(request, response);
    }
}
