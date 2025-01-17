package com.dotmarketing.startup.runalways;

import com.dotcms.business.WrapInTransaction;
import com.dotmarketing.startup.runonce.Task04355SystemEventAddServerIdColumn;
import java.util.ArrayList;
import java.util.List;

import com.dotmarketing.business.APILocator;
import com.dotmarketing.business.Layout;
import com.dotmarketing.business.LayoutAPI;
import com.dotmarketing.exception.DotDataException;
import com.dotmarketing.exception.DotRuntimeException;
import com.dotmarketing.startup.StartupTask;
import com.dotmarketing.util.Logger;

public class Task00006CreateSystemLayout implements StartupTask {
	List<String> missingPortlets=new ArrayList<String>();

	@Override
	@WrapInTransaction
	public void executeUpgrade() throws DotDataException, DotRuntimeException {
		try {
			Layout layout=getAdminLayout();
			LayoutAPI api=APILocator.getLayoutAPI();
			List<String> portletIds=layout.getPortletIds();
			if (portletIds==null) {
				portletIds=new ArrayList<String>();
			}
			portletIds.addAll(missingPortlets);
			api.setPortletIdsToLayout(layout, portletIds);
		} catch (DotDataException e) {
			Logger.warn(Task00006CreateSystemLayout.class, "DotDataException: " + e.getMessage(), e);
		}
	}
	
	private Layout getAdminLayout() throws DotDataException{
		List<Layout> layouts;
		layouts = APILocator.getLayoutAPI().findAllLayouts();
		for (Layout layout:layouts) {
			if (layout.getName().equalsIgnoreCase("CMS Admin") ||layout.getName().equalsIgnoreCase("Admin")  ) {
				return layout;
			}
		}
		Layout layout=new Layout();
		layout.setName("CMS Admin");
		layout.setDescription("Permissions & Maintenance");
		APILocator.getLayoutAPI().saveLayout(layout);
		return layout;
	}

	public boolean forceRun() {
		try {
			final Task04355SystemEventAddServerIdColumn systemEventAddServerIdColumn = new Task04355SystemEventAddServerIdColumn();
			if (systemEventAddServerIdColumn.forceRun()) {
				systemEventAddServerIdColumn.executeUpgrade();
			}
		} catch (Exception e) {
			Logger.error(Task00006CreateSystemLayout.class,
					"Error Applying upgrade task from Task00006CreateSystemLayout.", e);
		}
		return true;
	}

}
